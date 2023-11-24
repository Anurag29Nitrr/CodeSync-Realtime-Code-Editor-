import React, {useEffect, useRef, useState} from 'react'
import Client from '../components/Client'
import { toast } from 'react-hot-toast';
import Editor from '../components/Editor'
import { initSocket } from '../socket';
import ACTIONS from '../Actions';
import {Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

const EditorPage = () => {

    const socketRef = useRef(null)//component won't rerender on change
    const location = useLocation();
    const codeRef = useRef(null);
    const {roomId} = useParams();
    const reactNavigator = useNavigate();
    useEffect(()=>{
      const init = async () =>{
        socketRef.current = await initSocket();
        socketRef.current.on('connect_error', (err) => handleErrors(err));
        socketRef.current.on('connect_failed', (err) => handleErrors(err));

        function handleErrors(e) {
          console.log('socket error', e);
          toast.error('Socket connection failed, try again later.');
          reactNavigator('/');
      }

        socketRef.current.emit(ACTIONS.JOIN,{
          roomId,
          username: location.state?.username,
        });

        //listening for joined evenet

        socketRef.current.on(
          ACTIONS.JOINED,
          ({
            clients,username,socketId
          }) => {
            if(username !== location.state?.username)
            {
              toast.success(`${username} joined the room.`)
            }
            setClients(clients)
            socketRef.current.emit(ACTIONS.SYNC_CODE,{
              code: codeRef.current,
              socketId,
            })
          }
        )
        // listening for disconnected
        socketRef.current.on(ACTIONS.DISCONNECTED, ({socketId, username}) => {
          toast.success(`${username} left the room.`);
          setClients((prev) => {
            return prev.filter(client => client.socketId !== socketId)
          })
        })

      };
      init();
      // cleaning function to prevent memory leak
      return () => {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);

      }
    },[]);

    async function copyRoomId() {
      try{
        await navigator.clipboard.writeText(roomId);
        toast.success('Room Id has been copied to clipboard')
      } catch(err){
        toast.error('Could not copy room Id');
        console.error(err)
      }
    }

    function leaveRoom() {
      reactNavigator('/');
    }

    const [clients, setClients] = useState([])
    if(!location.state)
    {
      return <Navigate to='/' />
    }

  return (
    
    <div className='mainWrap'>
      <div className="aside">
        <div className="asideInner">
            <div className="logo">
                <img className='logoImage' src="/code-sync.png" alt="" />
            </div>
            <h3>Connected</h3>
            <div className="clientsList">
                {clients.map(client=>(
                    <Client key={client.socketId} username={client.username}/>
                    ))}
            </div>
        </div>
        <button className='btn copyBtn' onClick={copyRoomId}>Copy ROOM ID</button>
        <button className='btn leaveBtn' onClick={leaveRoom}>Leave</button>
      </div>
      <div className="editorWrap">
        <Editor socketRef={socketRef} roomId={roomId} onCodeChange={(code)=>
        {
            codeRef.current = code;
        }}/>
      </div>  
    </div>
  )
}

export default EditorPage
