const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
var bcrypt =require('bcryptjs');
const app = express();
const port = 4000;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const multer=require('multer');
const uploadMiddleware = multer({dest:'uploads/'});
const fs = require('fs');


const salt= bcrypt.genSaltSync(10);
const secret= 'ytfdxfchiojhbnfgyuihgjkjnjhghjnm567n'

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));


mongoose.connect('mongodb+srv://blog:Vmt28uaCZyBlKV4h@cluster0.n1uug.mongodb.net')

// Add a GET route for the root path to handle requests to /

// Define the /register POST route
app.post('/register', async (req, res) => {
    const {username,password} = req.body;
    try{
       const userDoc = await User.create({
        username, 
        password:bcrypt.hashSync(password,salt),
    });
    res.json(userDoc);
    } catch(e) {
        console.log(e);
        res.status(400).json(e);
    }
});
// Add a GET route for /register if needed
app.get('/register', (req, res) => {
    res.send('This is the GET response for /register. Use POST to submit the form.');
});

app.post('/login',async (req,res) => {
    const {username,password} = req.body;
    const userDoc = await User.findOne({username});
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
        //logged in
        jwt.sign({username, id:userDoc._id}, secret, {}, (err,token) => {
            if (err) throw err;
            res.cookie('token', token).json({
                id:userDoc._id,
                username,
            });
        });
    } else {
        res.status(400).json('wrong credentials');
    }
});
app.get('/login', (req, res) => {
    res.send('This is the GET response for /login. Use POST to submit the form.');
});

app.get('/profile',(req,res)=> {
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, (err,info)=>{
        if (err) throw err;
        res.json(info);
        
    });
});

app.post('/logout', (req,res) =>{
    res.cookie('token','').json('ok');
});

app.post('/post',uploadMiddleware.single('file'), async (req,res) => {
    const {originalname,path} = req.file;
    const parts= originalname.split('.');
    const ext= parts[parts.length-1];
    const newPath =  path+'.'+ext;
    fs.renameSync(path,newPath);
    
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async(err,info)=>{
        if (err) throw err;
        const {title,summary,content} = req.body;
        const postDoc = await Post.create({
           title,
           summary,
           content,
           cover:newPath,
           author:info.id,
        });
        res.json(postDoc);
        
    });

    
});
app.post('/post/',uploadMiddleware.single('file'),async(req,res)=> {
let newPath =  null;
   if (req.file) {
    const {originalname,path} = req.file;
    const parts= originalname.split('.');
    const ext= parts[parts.length-1];
    const newPath =  path+'.'+ext;
    fs.renameSync(path,newPath);

   }
   const {token} = req.cookies;
   jwt.verify(token, secret, {}, async(err,info)=>{
    if (err) throw err;
    const {title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) == JSON.stringify(info.id);
    res.json({isAuthor,postDoc,info});
    if(!isAuthor) {
        return res.status(400).json('you are not the author');
    }
    await postDoc.update({
        title,
        summary,
        content,
        cover:newPath ? newPath :postDoc.cover,
    })
    // const postDoc = await Post.create({
    //    title,
    //    summary,
    //    content,
    //    cover:newPath,
    //    author:info.id,
    // });
    res.json(postDoc);
    
});

});

app.get('/post',async(req,res)=>{
    res.json(
        await Post.find()
        .populate('author', ['username'])
        .sort({createdAt: -1})
        .limit(20)
    );
});
app.get('/post/:id',async(req,res) => {
    const {id}=req.params;
    const postDoc = await Post.findById(id).populate('author',['username']);
    res.json(postDoc);
})
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
//mongosh "mongodb+srv://cluster0.n1uug.mongodb.net/" --apiVersion 1 --username blog
// mongosh "mongodb+srv://cluster0.n1uug.mongodb.net/" --apiVersion 1 --username blog
//mongodb+srv://blog:Vmt28uaCZyBlKV4h@cluster0.n1uug.mongodb.net/