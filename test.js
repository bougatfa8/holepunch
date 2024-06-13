import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import Hypercore from 'hypercore'
import Hyperbee from 'hyperbee'

let room_core = new Hypercore('room');
const swarm = new Hyperswarm()
const conns = []
let core
let topic

document.querySelector('#create-chat-room').addEventListener('click', formApply);
document.querySelector('#join-chat-room').addEventListener('click', formApplyTopic);

async function initializeRoom() {
  await room_core.ready();
  const chatRoomTopic = document.querySelector('#chat-room-topic');
  console.log('Initializing room');

  if (room_core.length > 0) {
    for (let i = 0; i < room_core.length; i++) {
      const block = await room_core.get(i);
      const jsonObject = JSON.parse(block);
      const key = Object.keys(jsonObject)[0];
      const value = jsonObject[key];
      console.log(value);
      const newDiv = document.createElement('div');
      newDiv.className = 'chat-room-topic';
      newDiv.innerText = key;
      newDiv.addEventListener('click', () => {
        document.querySelector('#messages').innerHTML = '';
        retrieveMessage(value);
        topic = value;
      });
      chatRoomTopic.appendChild(newDiv);
    }
  }
}

initializeRoom();

swarm.on('connection', conn => {
  const name = b4a.toString(conn.remotePublicKey, 'hex');
  console.log('* got a connection from:', name, '*');
  conns.push(conn);
  conn.once('close', () => conns.splice(conns.indexOf(conn), 1));
  conn.on('data', async data => {
    console.log(`${name}: ${data}`);
    const roomMessage = JSON.stringify({ [name]: data });
    if (core && core.writable) {
      await core.append(roomMessage);
    }
  });
  conn.on('error', e => console.log(`Connection error: ${e}`));
});

function formApply() {
  const roomName = document.querySelector('#NameOrTopicInput').value;
  if (roomName) {
    createChatRoom(roomName);
  } else {
    alert('Room creation cancelled.');
  }
}

function formApplyTopic() {
  const topic = document.querySelector('#NameOrTopicInput').value;
  if (topic) {
    joinSwarmTopic(topic);
  } else {
    alert('Room Join cancelled.');
  }
}

function createChatRoom(roomName) {
  const topicBuffer = crypto.randomBytes(32);
  joinSwarm(topicBuffer, roomName);
}

async function joinSwarm(topicBuffer, roomName) {
  const discovery = swarm.join(topicBuffer, { client: true, server: true });
  const topic = b4a.toString(topicBuffer, 'hex');
  alert('Creating room: ' + roomName + ' with topic: ' + topic);

  const roomData = JSON.stringify({ [roomName]: topic });
  await room_core.append(roomData);
  const chatRoomTopic = document.querySelector('#chat-room-topic');

  const newDiv = document.createElement('div');
  newDiv.className = 'chat-room-topic';
  newDiv.innerText = roomName;
  newDiv.addEventListener('click', () => {
    document.querySelector('#messages').innerHTML = '';
    retrieveMessage(topic);
  });
  chatRoomTopic.appendChild(newDiv);

  core = new Hypercore(topic);
  await core.ready();
  discovery.flushed();
}

async function joinSwarmTopic(topicString) {
  const topicBuffer = b4a.from(topicString, 'hex');
  console.log(topicBuffer);
  const discovery = swarm.join(topicBuffer, { client: true, server: true });
  const topic = topicString;
  alert('Joining room with topic: ' + topic);

  const chatRoomTopic = document.querySelector('#chat-room-topic');
  const newDiv = document.createElement('div');
  newDiv.className = 'chat-room-topic';
  newDiv.innerText = 'Joined room';

  newDiv.addEventListener('click', () => {
    document.querySelector('#messages').innerHTML = '';
    retrieveMessage(topic);
  });
  chatRoomTopic.appendChild(newDiv);

  core = new Hypercore(topic);
  await core.ready();
  discovery.flushed();
}

document.querySelector('#message-form').addEventListener('submit', sendMessage);

async function retrieveMessage(topic) {
  console.log('retrieve message');
  core = new Hypercore(topic);
  await core.ready();
  for (let i = 0; i < core.length; i++) {
    const block = await core.get(i);
    const jsonObject = JSON.parse(block);
    const from = Object.keys(jsonObject)[0];
    const message = jsonObject[from];
    console.log(message);

    const $div = document.createElement('div');
    $div.textContent = `<${from}> ${message}`;
    document.querySelector('#messages').appendChild($div);
  }
}

async function sendMessage(e) {
  e.preventDefault();
  const message = document.querySelector('#message').value;
  document.querySelector('#message').value = '';
  onMessageAdded('You', message);
  const roomMessage = JSON.stringify({ You: message });

  if (core && core.writable) {
    await core.append(roomMessage);
  }

  for (const peer of conns) {
    peer.write(message);
  }
  console.log('Sent message');
}

function onMessageAdded(from, message) {
  const $div = document.createElement('div');
  $div.textContent = `<${from}> ${message}`;
  document.querySelector('#messages').appendChild($div);
}
