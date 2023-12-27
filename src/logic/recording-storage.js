const getPresignedPutUrl = () => {
    return fetch('https://b7tfgad8z3.execute-api.us-east-2.amazonaws.com/test/recording', {
        method: 'POST',
    });
};

const getPresignedGetUrl = (id) => {
    return fetch('https://b7tfgad8z3.execute-api.us-east-2.amazonaws.com/test/recording?id=' + id, {
        method: 'GET',
    });
};

const sendAudioFile = (url, file) => {
    // const formData = new FormData();
    // formData.append('audio-file', file);
    return fetch(url, {
        method: 'PUT',
        headers: {
            "Content-Type": "audio/wav",
        },
        body: file
    });
};

const getAudioFileWithSignedUrl = (url) => {
    return fetch(url, {
        method: 'GET',
    });
};


// returns generated file id
async function saveAudioFile(audioBlob) {
    let res  = await getPresignedPutUrl();
    let body = await res.json();
    let presignedUrl = body.url;    
    await sendAudioFile(presignedUrl, audioBlob);
    return body.key;
}

async function getAudioFile(id) {
    let res  = await getPresignedGetUrl(id);
    let body = await res.json();
    let presignedUrl = body.url;    
    let file = await getAudioFileWithSignedUrl(presignedUrl);
    return file;
}

module.exports = {
    getAudioFile, saveAudioFile
}