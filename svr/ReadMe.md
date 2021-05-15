## Working
1. Create a pi server with  ( POST to regiester devices   +  Websocket arr for each device) -done
2. Sending a post from ESP to the pi server to register a websocket: https://randomnerdtutorials.com/esp8266-nodemcu-http-get-post-arduino/#http-post - done
3. Register the websocket address  - done
4. Server will send ReadSignal - done
5. Chip will pass value  - done
6. based on return draw switch values html - done
7. Save Switch config => To real values - done
8. Update changes to the esp through the client socket - done
9. Return back and updated values via socket to each admin console & and update only the switch status. - done
10. Improve : loop through all ips to find active devices. 
11. To auto scan for devices every 1 min



ServerApp - 
1. Read a post request by the ip to start working with device - done
2. will create a socket connection on the received address - done

Websocket
1. Websocket Client Factory with fixed ip - done
2. All devices must pass their server ip to this client - done
3. Factory will create a socketconnection for each devices - done
4. Factory will display the incomming message - done
5. Data received will be processed / passed on to other devices / dashboard 

***Requirement***
1. fixed ip on pi  
2. Server on pi connected to logos 


Build smaller modules : 1117 voltage regulator , esp01,relay, 

DIR : #D2C => Device to Cloud and vice versa
DIR : #C2A => Cloud to Admin and vice versa