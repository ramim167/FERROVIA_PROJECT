import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()
const app=express();app.use(cors());app.use(express.json())
app.get('/api/health',(req,res)=>res.json({success:true,message:'Railway API is running'}))
app.get('/api/stations',(req,res)=>res.json({success:true,data:['Dhaka','Chattogram','Rajshahi','Khulna','Sylhet']}))
app.get('/api/trains/search',(req,res)=>res.json({success:true,data:[],message:'Connect this route to the Oracle repository using the supplied database schema.'}))
app.listen(process.env.PORT||5000,()=>console.log(`API running on http://localhost:${process.env.PORT||5000}`))
