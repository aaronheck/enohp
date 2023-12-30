'use strict';

var AWS = require('aws-sdk');
const { 
    v4: uuidv4,
  } = require('uuid');

const s3 = new AWS.S3({apiVersion: '2006-03-01', region: 'us-east-1'});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async function handler(event, context) {
    const myBucket = 'enohp';
    const signedUrlExpireSeconds = 60 * 5
    console.log(event);
    if(event.httpMethod == "GET") {
        if(!event["queryStringParameters"] || !event["queryStringParameters"]["id"]) {
            context.succeed({ statusCode: 400, body: "Unsupported type", headers });    
            return;
          }

        let id = event["queryStringParameters"]["id"];
        const url = s3.getSignedUrl('getObject', {
            Bucket: myBucket,
            Key: id,
            Expires: signedUrlExpireSeconds
        });
        context.succeed({ statusCode: 200, body: JSON.stringify({url:url}), headers });
        return;
    }

    if(event.httpMethod == 'POST') {
        const myKey = uuidv4() + '.wav';

        const url = s3.getSignedUrl('putObject', {
            Bucket: myBucket,
            Key: myKey,
            ContentType: "audio/wav",
            Expires: signedUrlExpireSeconds
        })

        context.succeed({ statusCode: 200, body: JSON.stringify({url:url, key:myKey}), headers });
        return;
    }

    context.succeed({ statusCode: 400, body: "Unsupported type", headers });    
};