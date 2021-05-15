const express = require("express");
const socket = require("socket.io");
const bodyParser = require("body-parser");
const WebSocket = require('ws');
const http = require("http");
const https = require("https");
const myconfig = require("./myconfig");

var app = express();
var devices = []; // deviceid / socketconnection

const currentServerAddress = myconfig.serveraddress;//required to register devices

app.use("/web",express.static("src"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.post("/reg", function(req,res, body){
   console.log(req.body);
	const device = req.body;
  if(!device.dev)return console.log("Req: Device name missing.");
  if(!device.ip)return console.log("Req: Device ip missing.");


	var existingdevice = devices.filter(d => d.dev == device.dev);
  if(existingdevice.length == 0){
		console.log("Adding new device");
    
      setTimeout( () => createNewSocket(device), myconfig.iotwebsockport);
   
	}else{
    console.log("device already exists");
  }
  res.json("OK");
});


function createNewSocket(device){
  try {
      const ws = new WebSocket('ws://' + device.ip + '/ws');
      device.ws = ws;
      device.data = "";
      ws.on('open', () => {
        console.log("OPENED");
        ws.send("DRD");
        devices.push(device);
        //setInterval(()=> ws.send("DRD"), 3000);
      });
      
      ws.on('message', (data) => {//incoming
        console.log("Received from device", data);
        if(data.startsWith("D2C#")){
          device.data = data;
          controlio.sockets.emit('admin', device);
          //data.split("@")[1].split("#").forEach(pin => device.data[pin.split("")])
        }
        console.log(data);
      });

  }catch{}
}

app.get("/devices", function(req,res){
  res.json(devices.map(d => ({ dev: d.dev, ip : d.ip,data: d.data })));
});


app.get("/refreshdevices", function(req,res){
  devices = [];
  var ip = "192.168.1.";
  for(let i = 2; i < 100; i++){
      var tmp = ip + i;
      console.log(tmp);
      $get("http://"+tmp + "/sendfirsthello?ip=" + currentServerAddress+ "/reg")
      
  }
 //res.json(devices.map(d => ({ dev: d.dev, ip : d.ip,data: d.data })));
});

var server = app.listen(myconfig.serverPort, function(){
    console.log("Listening.... ");
});



//3. Creating A Dasshboard Socket
var controlio = socket(server);
controlio.on('connection', (socket) => {
    console.log('made socket connection with html');
    //socket.emit("admin", {x : "sds"})
    //setInterval(() => socket.emit('admin', "test"), 1000);
    //setInterval(() => controlio.send("test") &&  socket.emit("admin", "admintest") &&   controlio.sockets.emit("admin", "admintest2"), 1000);
    setInterval(() => socket.to("admin").emit("admintest"), 1000);
    socket.on("message",function(data){
      console.log("recv", data);
    });
    socket.on("admin",function(data){
        console.log("recieved" , data); // C2D#E1@3=1
        console.log("TOTest1", data);
        if(typeof data == "string" && data.startsWith("C2D")){          

          //New Status from Admin
          var parts = data.split("@");
          var strdev = parts[0].split("#")[1];
          var exswitchno = parts[1].split("=")[0];
          var newSwitchval = parts[1].split("=")[1];

          var dev = devices.filter(d => d.dev == strdev);
          if(dev.length == 0)return console.log(strdev + " -device not found :" + data);
          //console.log(dev)
          //Existing Status
          dev = dev[0];
          var d = dev.data;
          var dparts = d.split("@");
          var switches = dparts[1].split("#").filter(x => x.indexOf("=") > 0);
          var requiresUpdate = false;
          var returnVal = "C2D#" + dev.dev + "@" + switches.map(s => {
            var switchno = s.split("=")[0];
            var switchstatus = s.split("=")[1];
            if(switchno == exswitchno && switchstatus != newSwitchval) {
              requiresUpdate = true;
              return switchno + "=" + newSwitchval;
            }
            return s;
          }).join("#") + "#";
          
          // if(!requiresUpdate){
          //  return  console.log("Switch status is already " + switchstatus);
          // }

          dev.ws.send(returnVal); 
          console.log("TODO4", "ensure the value is read by the device");


        }
        //TODO find the device and update the websocket        
        //controlio.sockets.emit('admin', device);
        //controlio.sockets.emit('admin', data);
    });
})


function pingAllDevices() {
  //app.post("/reg", function(req,res, body){

}

function $get(url, reqdata = "",res,rej){
  const data = typeof reqdata == "string" ? reqdata : JSON.stringify(reqdata);
  var hostname = url.substr(url.indexOf("//") + 2);
  var path = hostname.substr(hostname.indexOf("/") )
  hostname = hostname.substr(0,hostname.indexOf("/"))
  var caller =  url.startsWith("https://") ? https : http;

  const options = {
    hostname,
    port: url.startsWith("https://") ? 443 : 80,
    path,
    method: 'GET',
        headers: {
            'Content-Type': 'text/html',
            'Content-Length': data.length,
        },
    }

    //return new Promise((res,rej) => {
        const req = caller.request(options, (resi) => {
            var str = "";
            resi.on("data", (d) => str += d);
            resi.on('end', (d) => res && res([str]));
            console.log(`statusCode: ${resi.statusCode}`)
        });

        req.on('error', (error) => rej && rej([error]))

        
        req.write(data)
        req.end()
    //});
  //}

}

