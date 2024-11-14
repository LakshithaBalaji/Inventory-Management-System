const express=require('express');
const error_middleware=require('../middleware/error_middleware');
const user=require('../routes/user_route');
const supplier=require('../routes/supplier_route');
const product = require('../routes/product_route');
const transaction=require('../routes/transaction_route');
const report=require('../routes/report_route');
const alert=require('../routes/alerts');


const auth = require('../middleware/auth');
const { error } = require('winston');
const errorHandler = require('../middleware/error_middleware');

module.exports=function(app){
    app.use(express.json()); 
    app.use('/api/users', user);
    app.use('/api/products', product);
    app.use('/api/suppliers',supplier);
    app.use('/api/transactions',transaction);
    app.use('/api/reports',report);
    app.use('/api/alerts',alert);
    app.use(error_middleware);
     
}