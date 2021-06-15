# Learning-Real-Time-Communication

![image](https://user-images.githubusercontent.com/53896111/122022772-8103e900-cdf9-11eb-80e1-719c899eaf3e.png)

架设一个Web服务器，服务器兼具信令交换的能力(信令服务也可以独立部署)，两个浏览器通过Web Server交换会话信息，就能建立P2P通道来传输媒体流，进行1v1的视频会议。两个浏览器向Web服务器请求页面，并进行SDP交换，然后在浏览器之间直接建立P2P Transport，进行媒体流传输。

![image](https://user-images.githubusercontent.com/53896111/122023104-cc1dfc00-cdf9-11eb-82a0-3ec3061a4a60.png)

![image](https://user-images.githubusercontent.com/53896111/122023123-d213dd00-cdf9-11eb-97f7-290545dea470.png)
