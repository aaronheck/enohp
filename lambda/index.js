'use strict';

var AWS = require('aws-sdk');
const {
  v4: uuidv4,
} = require('uuid');
AWS.config.update({
  region: "us-east-1", // replace with your region in AWS account
});

const DynamoDB = new AWS.DynamoDB();
const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' });

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const RECORDING_BUCKET = 'enohp';
const SIGNED_URL_EXPIRY_SECONDS = 60 * 5


async function handleRecording(event, context) {
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
    let body = JSON.parse(event.body);
    // this is the game id.
    if(!body.id) {
      context.succeed({ statusCode: 400, body: "Missing gameid.", headers });
    }

    const gameId = body.id;

    const recordingKey = uuidv4() + '.wav';

    const url = s3.getSignedUrl('putObject', {
      Bucket: RECORDING_BUCKET,
      Key: recordingKey,
      ContentType: "audio/wav",
      Expires: SIGNED_URL_EXPIRY_SECONDS
    });
    let game = await getGame(gameId, false);
    console.log("brosenheck: game")
    console.log(game);
    game.turns = game.turns || [];
    // we should have an idea for a turn so that it does not look like a turn can be played twice.
    game.turns.push(
      {
        "guess": body.guess || "Meatball",
        // s3 key
        "recording": recordingKey,
        // nickname of player from cookies.
        "nickname": body.nickname || "aaron"
      }
    );

    if(!await saveGame(gameId, game)) {
      context.succeed({ statusCode: 500, body: "Could not save game.", headers });
    }



    context.succeed({ statusCode: 200, body: JSON.stringify({ url: url, key: recordingKey }), headers });
    return;
  }

  context.succeed({ statusCode: 400, body: "Unsupported type", headers });
  return false;
}


async function saveGame(gameId, game) {

  console.log("Game id: " + gameId);
  const params = {
    TableName: "enohp-games",
    Item: AWS.DynamoDB.Converter.marshall(game),
  };
  try {
    await DynamoDB.putItem(params).promise();
  } catch (e) {
    console.log("cannot save game");
    console.log(e);
    return false;
  }
  return true;
}
async function createGame() {
  let gameId = uuidv4();
  let game = {
    id: gameId
  };
  if(await saveGame(gameId, game)) {
    return id;
  }
  return null;
}

async function getGame(id, getSignedUrl=false) {
  console.log("Getting game");
  var params = {
    Key: {
      "id": {
        S: id
      }
    },
    TableName: "enohp-games"
  };

  console.log(params); 

  try { 
    let item = await DynamoDB.getItem(params).promise();
    console.log(item);
    let game = AWS.DynamoDB.Converter.unmarshall(item.Item);
    console.log(game);
    if(game.turns && getSignedUrl) {
      game.turns.forEach(turn => {
        // might not want to actually sign all turns if not needed. 
        const url = s3.getSignedUrl('getObject', {
          Bucket: RECORDING_BUCKET,
          Key: id,
          Expires: SIGNED_URL_EXPIRY_SECONDS
        });
        turn.signedGet = url;
      });
    }
    return game;
  } catch (e) {
    console.log("cannot get game");
    console.log(e);
    return null;
  }
}

async function handleGame(event, context) {

  // creates game.
  if (event.httpMethod == 'POST') {
    let res = {};
    let id = await createGame();
    if (id === null) {
      context.succeed({ statusCode: 500, body: JSON.stringify(res), headers });
      return;
    }
    res.id = id;
    context.succeed({ statusCode: 200, body: JSON.stringify(res), headers });
    return;
  }

  // gets game.
  if (event.httpMethod == 'GET') {
    console.log("GET!!!");
    if (!event["queryStringParameters"] || !event["queryStringParameters"]["id"]) {
      context.succeed({ statusCode: 404, body: "Game not found", headers });
      return;
    }

    let res = {};
    let game = await getGame(event["queryStringParameters"]["id"]);
    if(!game) {
      context.succeed({ statusCode: 404, body: "Game not found", headers });
      return;
    }
    res.game = game;
    context.succeed({ statusCode: 200, body: JSON.stringify(res), headers });
    return;
  }

  context.succeed({ statusCode: 400, body: "Unsupported type", headers });
  return false;
}

exports.handler = async function handler(event, context) {
  console.log(event);
  if (event.path === "/recording") {
    await handleRecording(event, context);
    return;
  }

  if (event.path === "/game") {
    await handleGame(event, context);
    return;
  }

  context.succeed({ statusCode: 404, body: "Unsupported path!", headers });
};