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
document.querySelector('#join-chat-room').addEventListener('click', formApply);

// document.querySelector('#messages').addEventListener('submit', sendMessage)
    



async function initializeRoom() {
  await room_core.ready();  // Wait for the room_core to be ready
  const chatRoomTopic = document.querySelector('#chat-room-topic');
  console.log('Initializing room');

  if(room_core.length  > 0) {

  
  for (let i = 0; i < room_core.length; i++) {
      const block = await room_core.get(i);
      const jsonObject = JSON.parse(block);
      // Retrieve the key from the object
      const key = Object.keys(jsonObject)[0];
      const value = jsonObject[key];
      console.log(value)
      const newDiv = document.createElement('div');
      newDiv.className = 'chat-room-topic'; 
      newDiv.innerText = key;
      newDiv.addEventListener('click', () => {
        document.querySelector('#messages').innerHTML = '';
        retrieveMessage(value)
        topic = value;
    });
  
      chatRoomTopic.appendChild(newDiv);
  }
  await room_core.close()
  }
}


// Call the function to initialize the room
initializeRoom();


swarm.on('connection', conn => {
    const name = b4a.toString(conn.remotePublicKey, 'hex')
    console.log('* got a connection from:', name, '*')
    conns.push(conn)
    conn.once('close', () => conns.splice(conns.indexOf(conn), 1))
    conn.on('data', data => {
      console.log(`${name}: ${data}`)
      const roomMessage = JSON.stringify({ [name]: data });
      // Append the JSON string to room_core
      core.append(roomMessage);
    })
    conn.on('error', e => console.log(`Connection error: ${e}`))
  })


function formApply(){
  var roomName =document.querySelector('#NameOrTopicInput').value;
  if (roomName) {
      createChatRoom(roomName)
  } else {
      alert('Room creation cancelled.');
  }
}
  



function createChatRoom(roomName) {
  const topicBuffer = crypto.randomBytes(32)
  joinSwarm(topicBuffer,roomName)
}

async function joinSwarm (topicBuffer,roomName) {
    const discovery = swarm.join(topicBuffer, { client: true, server: true })  
    const topic = b4a.toString(topicBuffer, 'hex')
    alert('Creating room: ' + roomName + ' with topic: ' + topic);
    // Convert the object to a JSON string
    const roomData = JSON.stringify({ [roomName]: topic });

    // Append the JSON string to room_core
    room_core.append(roomData);
    const chatRoomTopic = document.querySelector('#chat-room-topic');

    const newDiv = document.createElement('div');
    newDiv.className = 'chat-room-topic'; // Assign the class to the new div
    newDiv.innerText = roomName;
    newDiv.addEventListener('click', () => {
      document.querySelector('#messages').innerHTML = '';
  
      retrieveMessage(topic)
  })
  ;
    await room_core.close()

    chatRoomTopic.appendChild(newDiv);
    core = new Hypercore(topic)
    discovery.flushed()
  }
  document.querySelector('#message-form').addEventListener('submit', sendMessage)

  async function retrieveMessage(topic) {

    console.log('retrieve message');
    const core = new Hypercore(topic);
  
    await core.ready();
    for (let i = 0; i < core.length; i++) {
      const block = await core.get(i); // Await the promise resolution
      const jsonObject = JSON.parse(block);
      
      // Retrieve the key from the object
      const from = Object.keys(jsonObject)[0];
      const message = jsonObject[from];
      console.log(message); // Log the message
  
      const $div = document.createElement('div');
      $div.textContent = `<${from}> ${message}`; // Correctly set the text content
      document.querySelector('#messages').appendChild($div);
    }
    core.close();
  }
  

  function sendMessage (e) {
    const core = new Hypercore(topic);
    const message = document.querySelector('#message').value
    document.querySelector('#message').value = ''
    e.preventDefault()
    onMessageAdded('You', message)
    // Send the message to all peers (that you are connected to)
    const peers = [...swarm.connections]
      for (const peer of peers) {
        peer.write(message)
      }
      console.log('Sent message')
      const roomMessage = JSON.stringify({ You: message });
      // Append the JSON string to room_core
      core.append(roomMessage);
  }
  
  // appends element to #messages element with content set to sender and message
  function onMessageAdded (from, message) {
    const $div = document.createElement('div')
    $div.textContent = `<${from}> ${message}`
    document.querySelector('#messages').appendChild($div)
  }
