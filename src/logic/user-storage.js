async function getNickname() {
    let nickname = localStorage.getItem("nickname");
    if (!nickname) {
        nickname = prompt("Perfect....we've been sitting here allllll day and nobody bothered to learn my name?", "Air bud");
        localStorage.setItem("nickname", nickname);
    }
    return nickname;
}

module.exports = {
    getNickname
}
