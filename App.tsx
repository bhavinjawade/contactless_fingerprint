import {StatusBar} from 'expo-status-bar'
import React from 'react'
import {StyleSheet, Text, View, TouchableOpacity, Alert, ImageBackground, Image, CameraRollAssetType, TextInput} from 'react-native'
import {Camera} from 'expo-camera'
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons'; 
import * as Permissions from 'expo-permissions';
import { FontAwesome5 } from '@expo/vector-icons'; 
const io = require('socket.io-client');

let endpoint = "http://127.0.0.1:5000/";

class App extends React.Component {
  camera: Camera;
  webSocket: any;
  videoTimer = 1;
  state = {
    setStartCamera: false,
    setPreviewVisible: false,
    setCapturedImage: null,
    setCameraType: "back",    
    setFlashMode: 'off',
    isConnected: false,
    passportNumber: "",
    serverReceived: false,
    setUsername: "",
    setPassword: "",
    countDown: 0,
    startRecording: false,
    setCapturedVideo: null
  }
  myInterval:any = null;
  // const [startCamera, setStartCamera] = React.useState(false)
  // const [previewVisible, setPreviewVisible] = React.useState(false)
  // const [capturedImage, setCapturedImage] = React.useState<any>(null)
  // const [cameraType, setCameraType] = React.useState(Camera.Constants.Type.back)
  // const [flashMode, setFlashMode] = React.useState('off')

  constructor(props:any){
    super(props); 
  }

  componentDidMount() {
    var ws = new WebSocket(encodeURI('http://228775c50384.ngrok.io/ws'));
    console.log("trying")
    this.webSocket = ws;
    
    ws.onopen = () => {
      console.log("Connection Created")
      this.setState({ isConnected: true });
    };

    ws.onmessage = (data) => {
      var reply = JSON.parse(data.data)
      console.log("Message Received:", reply)
      if(reply["type"] == "Picture" && reply["message"] == "Message Received"){
        this.setState({serverReceived: true});
      }
    }

    ws.onerror = e => {
      console.log("Socket Error: ", e.message);
    };

    ws.onclose = () => {
      console.log("Connection Closed")
      this.setState({ isConnected: false });
    }
  }

  __startCamera = async () => {
    const {status} = await Camera.requestPermissionsAsync()
    let {permissions } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
    console.log(status)
    if (status === 'granted') {
      this.setState({
        setStartCamera: true
      })
    } else {
      Alert.alert('Access denied')
    }
  }

  recordVideo = async() => {
    const options = {
      mute: true
    }
    this.camera.recordAsync(options).then(data => {
      console.log(data);
      this.setState({setCapturedVideo: data});
    }).catch(error => {console.log(error)})

    this.myInterval = setInterval(() => {
      this.setState({startRecording: true})
      if (this.state.countDown < this.videoTimer){ 
       this.setState({countDown: this.state.countDown + 1}) 
      }
      else{
        this.setState({startRecording: false})
        this.setState({countDown: 0})
        this.camera.stopRecording()
        this.setState({
          setPreviewVisible: true
        })
        clearInterval(this.myInterval)
      }
    }, 1000)

  }

  __takePicture = async () => {
    this.camera.takePictureAsync().then(photo => {
      this.setState({
        setCapturedImage: photo
      })
      console.log(this.state.setCapturedImage.uri);
      this.recordVideo();
    })
  }

  __savePhoto = async () => {
    try{
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'images/')
    }
    catch(error){
      console.log("Directory creation: ", error)
    }
    if(this.state.setCapturedImage != null){
      try{
        const base64 = await FileSystem.readAsStringAsync(this.state.setCapturedImage.uri, { encoding: 'base64' });
        this.webSocket.send(JSON.stringify({photo: base64, type: "Picture", username: this.state.setUsername}));
        await FileSystem.moveAsync({
          from: this.state.setCapturedImage.uri,
          to: FileSystem.documentDirectory + 'images/fingerprint.png'
        })
        console.log("saved Image")
      }
      catch (error){
        console.log("File save: ", error)
      }    
    }
    this.__saveVideo();
  }

  __saveVideo = async() => {
    try{
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'video/')
    }
    catch(error){
      console.log("Directory creation: ", error)
    }
    if(this.state.setCapturedImage != null){
      try{
        const base64 = await FileSystem.readAsStringAsync(this.state.setCapturedVideo.uri, { encoding: 'base64' });
        this.webSocket.send(JSON.stringify({photo: base64, type: "Video", username: this.state.setUsername}));
        await FileSystem.moveAsync({
          from: this.state.setCapturedVideo.uri,
          to: FileSystem.documentDirectory + 'video/fingerprint.png'
        })
        console.log("saved video")
      }
      catch (error){
        console.log("File save: ", error)
      }    
    }
  }
  __retakePicture = () => {
    this.setState({
      setCapturedImage: null,
      setPreviewVisible: false,
    })
    this.__startCamera()
  }

  __handleFlashMode = () => {
    if (this.state.setFlashMode === 'on') {
      this.setState({
        setFlashMode: 'off'
      })    
    } else if (this.state.setFlashMode === 'off') {
      this.setState({
        setFlashMode: 'on'
      })    
    } else {
      this.setState({
        setFlashMode: 'off'
      })    
    }
    console.log(this.state.setFlashMode)
  }

  __switchCamera = () => {
    if (this.state.setCameraType === 'back') {
      this.setState({
        setCameraType: 'front'
      })     
    } else {
      this.setState({
        setCameraType: 'back'
      }) 
    }
  }
  
  onChangeText = (text:any) => {
    console.log(text)
  }

  render(){

  return (
    <View style={styles.container}>
      {this.state.setStartCamera ? (
        <View
          style={{
            flex: 1,
            width: '100%',
          }}> 
          {this.state.setPreviewVisible && this.state.setCapturedImage ? (
              <CameraPreview photo={this.state.setCapturedImage} savePhoto={this.__savePhoto} retakePicture={this.__retakePicture} />
          ) : (
            <Camera
              type={this.state.setCameraType}
              flashMode={this.state.setFlashMode}
              style={{flex: 1}}
              ref={(r) => {
                this.camera = r
              }}> 
              <View
                style={{
                  flex: 1,
                  width: '100%',
                  backgroundColor: 'transparent',
                  flexDirection: 'row'
                }}>
                {this.state.startRecording ? (<View style={{position: 'absolute', right: 0, padding: 10, backgroundColor: 'black', opacity: 0.7}}><Text style = {{color: 'white'}}> <FontAwesome5 name="dot-circle" color="#00ff14"/> Recoding Started</Text></View>) : (<View></View>)}
                {this.state.startRecording ? (
                <View style={{position: 'absolute',
                              top: '10%',
                              alignSelf: 'center',
                              width: '100%', alignItems: 'center', justifyContent: 'center'}}>
                  <Text style={{paddingLeft: 20, paddingRight: 20, 
                                paddingTop: 10, paddingBottom: 10,
                                backgroundColor: 'black', opacity: 0.7, 
                                color: 'white', fontSize: 25,
                                borderRadius: 100}}>{this.state.countDown}</Text>
                </View>) : (<View></View>)}

                <View style={{width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center'}}>
                  <View style={{borderWidth: 2, borderColor: "white", 
                    width: '30%', height: '30%', borderTopRightRadius: 100,
                    borderTopLeftRadius: 100}}></View>
                </View>
                <View
                  style={{
                    position: 'absolute',
                    left: '5%',
                    top: '10%',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                </View>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    flexDirection: 'row',
                    flex: 1,
                    width: '100%',
                    padding: 20,
                    justifyContent: 'center',
                    backgroundColor: "black",
                    opacity: 0.6,
                    alignItems: 'center',
                  }}
                >
                  <TouchableOpacity
                    onPress={this.__switchCamera}
                    style={{
                      borderRadius: 1000,
                      height: 50,
                      width: 50,
                      borderColor: '#fff',
                      borderWidth: 2,
                      backgroundColor: this.state.setCameraType === 'back' ? 'transparent' : '#fff',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                <Text style={{fontSize: 30,                       
                              color: this.state.setCameraType === 'back' ? '#fff' : '#fff'}}>
                      <MaterialIcons name="switch-camera" size={24} color={this.state.setCameraType === 'back' ? '#fff' : 'black'} />
                    </Text>
                  </TouchableOpacity>
                  <View
                    style={{
                      alignSelf: 'center',
                      flex: 1,
                      alignItems: 'center',
                    }}
                  >
                    <TouchableOpacity
                      onPress={this.__takePicture}
                      style={{
                        width: 70,
                        height: 70,
                        bottom: 0,
                        borderRadius: 50,
                        backgroundColor: '#fff'
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={this.__handleFlashMode}
                    style={{
                      backgroundColor: this.state.setFlashMode === 'off' ? 'transparent' : '#fff',
                      borderRadius: 1000,
                      height: 50,
                      width: 50,
                      borderColor: '#fff',
                      borderWidth: 2,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 30
                      }}
                    >
                      <MaterialIcons name="flash-on" size={24} color={this.state.setFlashMode === 'off' ? '#fff' : 'black'} />
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Camera>
          )}
        {this.state.serverReceived ? (<View style = {{position: 'absolute', 
                backgroundColor: 'black',
                opacity: 0.6,
                height: '100%', width: '100%', 
                justifyContent: 'center', 
                alignItems: 'center'}}>
        <Ionicons name="md-checkmark-circle" size={100} color="white" /> 
        </View>) : (<View></View>)}
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: '#fff',
            alignItems: 'center',
            width: '100%',
          }}>
            <View style={{width: "100%",
        paddingLeft: '5%',
        paddingRight: '5%',
        paddingTop: '5%',
        paddingBottom: '5%',
        backgroundColor: '#ffffff',
        borderBottomColor: '#d3d3d3',
        borderBottomWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 2,  
        elevation: 5
      }}>
        <Text style={{fontSize: 25}}>Touchless Fingerprint</Text>
      </View>
      <View style={{width: "100%", alignItems:"center"}}>
        <TextInput placeholder = "Passport number"
                  style={{ height: 50, width: "80%",
                    fontSize: 18, marginTop: "10%", 
                    paddingTop: 10, marginBottom: "0%", borderColor: '#bcbcbc', 
                    borderWidth: 1, paddingLeft: 15, paddingRight: 15, paddingBottom: 10}}
                  onChangeText={username => this.setState({setUsername: username})}/>
        
        <TextInput secureTextEntry={true} placeholder = "Password"
                  style={{ height: 50, width: "80%", 
                  fontSize: 18, marginTop: "5%", 
                  paddingTop: 10, marginBottom: "0%", borderColor: '#bcbcbc', 
                  borderWidth: 1, paddingLeft: 15, paddingRight: 15, paddingBottom: 10}}
                  onChangeText={password => this.setState({setPassword: password})}/>
      </View>
      <View style = {{flex: 1,
            height: '100%',
            backgroundColor: '#fff',
            alignItems: 'center',
            width: '100%'}}>
          <TouchableOpacity
            onPress={this.__startCamera}
            style={{
              width: '80%',
              borderRadius: 4,
              backgroundColor: '#14274e',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              height: 40,
              position: 'absolute',
              bottom: 0,
              marginBottom: 20,
              marginTop: 20
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              Take picture
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      )}
    <View style={{width:'100%', 
        alignItems:'center',
        backgroundColor:this.state.isConnected == true ? 'green' : 'red',
        }}>
      <Text style = {{
          color: 'white',
          paddingTop: 5,
          paddingBottom: 5,
          fontSize: 15,
      }}>{this.state.isConnected == true ? 'Connected' : 'Disconnected'}</Text>
    </View>

    </View>
  )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  }
})

const CameraPreview = ({photo, retakePicture, savePhoto}: any) => {
  return (
    <View
      style={{
        backgroundColor: 'transparent',
        flex: 1,
        width: '100%',
        height: '100%'
      }}
    >
      <ImageBackground
        source={{uri: photo && photo.uri}}
        style={{
          flex: 1
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            padding: 15,
            justifyContent: 'flex-end'
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between'
            }}
          >
            <TouchableOpacity
              onPress={retakePicture}
              style={{
                width: 130,
                height: 40,

                alignItems: 'center',
                borderRadius: 4
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 20
                }}
              >
                Re-take
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={savePhoto}
              style={{
                width: 130,
                height: 40,

                alignItems: 'center',
                borderRadius: 4
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 20
                }}
              >
                save photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  )
}

export default App;