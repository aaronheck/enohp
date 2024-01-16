// returns generated file id
async function getGame(id) {
    let res = await fetch('https://b7tfgad8z3.execute-api.us-east-2.amazonaws.com/test/game?id=' + id, {
        method: 'GET',
    })
    let game = await res.json();
    
    return game;
}

module.exports = {
    getGame
}
