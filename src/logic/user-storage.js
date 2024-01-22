async function getNickname() {
    let nickname = localStorage.getItem("nickname");
    if (!nickname) {
        nickname = prompt("Perfect....we've been sitting here allllll day and nobody bothered to learn my name?", "Air bud");
    }
    return nickname;
}

module.exports = {
    getNickname
}
