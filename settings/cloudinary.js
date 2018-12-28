var cloudinary = require('cloudinary');
var config = require('config').get('uploader');

cloudinary.config({
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    api_secret: config.api_secret
});

module.exports = exports = cloudinary;