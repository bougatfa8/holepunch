import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import Hypercore from 'hypercore'
import Hyperbee from 'hyperbee'

const swarm = new Hyperswarm()
const conns = []
let core

let room_core = new Hyperbee(new Hypercore('room'));

document.querySelector('#create-chat-room').addEventListener('click', formApply);

function cas (prev, next) {
  // can use same-data or same-object lib, depending on the value complexity
  return prev.value !== next.value
}

async function initializeRoom() {
    await room_core.ready();  // Wait for the room_core to be ready
    const chatRoomTopic = document.querySelector('#chat-room-topic');
    console.log('await db.get')
    let result = await room_core.get('room')
    const newDiv = document.createElement('div');
    newDiv.innerText = result.key
    chatRoomTopic.appendChild(newDiv);
    
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
      core.append((`${name}: ${data}`))
    })
    conn.on('error', e => console.log(`Connection error: ${e}`))
  })


function formApply(){
           // Prompt the user to enter a room name
           var roomName = prompt("Please enter the room name:");

           // Topic for the room (example)
           var topic = "Some long topic name here";

           // Create an alert with the room name and the topic
           if (roomName) {
                createChatRoom(roomName)
               alert('Creating room: ' + roomName + ' with topic: ' + topic.substring(0, 11));
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
    room_core.put(roomName,topic , { cas })
    const chatRoomTopic = document.querySelector('#chat-room-topic');
    const newDiv = document.createElement('div');
    newDiv.innerText = roomName;
    chatRoomTopic.appendChild(newDiv);

    core = new Hypercore(topic)
    discovery.flushed()
  }



    
