// handle chat and websocket

const socket = new WebSocket('ws://localhost:8080/ws');

socket.onopen = (event) => {
    console.log('Connected to server');
};

socket.onmessage = (event) => {
    const output = document.getElementById('output');
    output.innerHTML += `<p>Received : ${event.data}</p>`;
};

function sendMessage() {
    const input = document.getElementById('input');
    const message = input.value;
    socket.send(message);
    input.value = '';
}