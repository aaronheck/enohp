'use strict';

var AWS = require('aws-sdk');
const {
  v4: uuidv4,
} = require('uuid');

const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' });

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const RECORDING_BUCKET = 'enohp';
const SIGNED_URL_EXPIRY_SECONDS = 60 * 5


function handleRecording(event, context) {
  if (event.httpMethod == "GET") {
    if (!event["queryStringParameters"] || !event["queryStringParameters"]["id"]) {
      context.succeed({ statusCode: 400, body: "Unsupported type", headers });
      return true;
    }

    let id = event["queryStringParameters"]["id"];
    const url = s3.getSignedUrl('getObject', {
      Bucket: RECORDING_BUCKET,
      Key: id,
      Expires: SIGNED_URL_EXPIRY_SECONDS
    });
    context.succeed({ statusCode: 200, body: JSON.stringify({ url: url }), headers });
    return true;
  }

  // this should use file hash: 
  // https://insecurity.blog/2021/03/06/securing-amazon-s3-presigned-urls/#:~:text=S3%20has%20a%20cap%20of,bit%20more%20than%20you%20expect.
  if (event.httpMethod == 'POST') {
    const myKey = uuidv4() + '.wav';

    const url = s3.getSignedUrl('putObject', {
      Bucket: RECORDING_BUCKET,
      Key: myKey,
      ContentType: "audio/wav",
      Expires: SIGNED_URL_EXPIRY_SECONDS
    })

    context.succeed({ statusCode: 200, body: JSON.stringify({ url: url, key: myKey }), headers });
    return;
  }

  context.succeed({ statusCode: 400, body: "Unsupported type", headers });
  return false;
}

function handleGame(event, context) {

  // creates/ updates game.
  if (event.httpMethod == 'POST') {
    let res = {};
    context.succeed({ statusCode: 200, body: JSON.stringify(res), headers });
    return;
  }

   // creates/ updates game.
   if (event.httpMethod == 'GET') {
    let res = {};
    context.succeed({ statusCode: 200, body: JSON.stringify(res), headers });
    return;
  }

  context.succeed({ statusCode: 400, body: "Unsupported type", headers });
  return false;
}

exports.handler = async function handler(event, context) {
  console.log(event);
  // legacy for turn based.
  if (event.requestContext.resourcePath === "/recording") {
    handleRecording(event, context);
    return;
  }

  if (event.requestContext.resourcePath === "/game") {
    handleGame(event, context);
    return;
  }

  context.succeed({ statusCode: 404, body: "Unsupported path!", headers });
};