+++
title = "GoDFS - a simple distributed filesystem"
author = ["Rounak Datta"]
draft = false
+++

This post is about a simple distributed file system I built in Go. Also, my first **org-mode**-written, _org-roam_-published article.

<style>.org-center { margin-left: auto; margin-right: auto; text-align: center; }</style>

<div class="org-center">
  <div></div>

Redundancy is the key in software engineering ~Paul Klint

</div>

I've been midway through [Designing Data-Intensive Applications](https://www.goodreads.com/book/show/23463279-designing-data-intensive-applications) and implementing such a distributed system was always on my stack. This implementation tries to cover most of the important aspects, yet largely simplified.

The source for this project is [rounakdatta/GoDFS](https://github.com/rounakdatta/GoDFS).


## Building Go Distributed File System {#building-go-distributed-file-system}


### Abstracting away the odds {#abstracting-away-the-odds}

Proven systems like [Google FileSystem (GFS)](https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf) and [Hadoop Distributed FileSystem](https://hadoop.apache.org/docs/r1.2.1/hdfs%5Fdesign.pdf) have almost made developers take distributed architectures for granted. We now regularly use open-source systems like the Hadoop ecosystem tools, managed cloud services without worrying of the underlying engineering behind scaling it across machines, data-centers and continents. In this implementation as well, we have abstracted the working of RPC, filesystem storage considerations, thus making it not production-ready.

{{< figure src="/ox-hugo/dynamodb_rant.png" caption="Figure 1: [Source](https://www.jeremydaly.com/takeaways-from-dynamodb-deep-dive-advanced-design-patterns-dat403/)" >}}


### The pieces {#the-pieces}

To build a distributed system which stores and serves files on-demand typically needs to have a set of persistent data stores, a coordinating unit and an user-facing dumb client.


#### DataNode {#datanode}

DataNodes in this system are just holding the data and when provided with an address can write data to or read data from that address. The data nodes deal with chunks of data which when aggregated by someone else makes sense. Ideally, the number of data nodes should be greater than one for it to be a distributed system. Also it is not necessary that a single data node would contain every chunk of a particular file.


#### NameNode {#namenode}

The NameNode is ideally a singular central coordinating unit of the entire system. It's responsibilities start from record-keeping of which all data nodes are available/healthy and helping the client decide with where all to put the chunks for an incoming file & where all to fetch the chunks from for a requested file. The name node also knows what is the chunk size (termed BlockSize later) and how many copies of data to keep (ReplicationFactor). The name node is the know-it-all guy of the system and therefore making it's death fatal for the system. Therefore we must have a backup name node (called Secondary NameNode) to which the NameNode is flushing all its meta periodically.


#### Client {#client}

Client does all the talking. Upon the client getting a request from the user interface, it's job is to first contact the NameNode for all the meta information. If it is a file `PUT` request, name node helps it by providing where all to keep the chunks in (the endpoints of the DataNodes and the target directory path within them). If it is a file `GET` request, the name node helps it by providing the intrinsic details of where exactly to obtain the chunks from. And thus the loop completes.


### The chunks {#the-chunks}

We must decide on a BlockSize factor which determines into how many pieces a file is broken into. Of course having this metric too high or low impacts the write and read performances of the system overall, but we need to find a justified value which has been benchmarked. The chunks (henceforth referred to as blocks) are stored as individual files and is indexed by the NameNode through a BlockId. Depending upon ReplicationFactor we might have redundant copies of the same block stored on multiple data nodes.


### The replication {#the-replication}

Replication is probably the most important factor in this context. We must decide upon the ReplicationFactor considering the cost-reliability trade-off. The replication in this system works as: When the client requests a particular DataNode to write a new block into its file system, the client also supplies with which all data nodes to replicate to. Now as the first data node finishes writing to its own file system, it itself connects to the next replication candidate data node and passes the remaining array of replication candidates. And thus the replication process finishes when the tail of the recursion returns to the client and the replicated file write can be concluded to have succeeded.


### The talking {#the-talking}

As the client communicates with the NameNode, DataNodes, as the DataNodes whisper to each other, what is the protocol of talking? We are using plain and simple RPC (Remote Procedural Calls) here in this case.


## Setting it up {#setting-it-up}

You can try GoDFS manually or by setting it up through Docker Compose. We can test and compile it to produce a binary as:

<a id="code-snippet--testing and building"></a>
```shell
make test
make build
```


### Natively on local host {#natively-on-local-host}

First, we need to set up the DataNode and NameNode daemons, we are starting 3 data nodes for example, and they are running on the same host:

<a id="code-snippet--booting datanodes"></a>
```shell
./godfs datanode --port 7000 --data-location .dndata1/
./godfs datanode --port 7001 --data-location .dndata2/
./godfs datanode --port 7002 --data-location .dndata3/
```

Next, we are initializing the NameNode providing it with the list of data nodes available. If not provided explicitly, the NameNode tries discovering services in the local host for a particular range of ports.

<a id="code-snippet--booting namenode"></a>
```shell
./godfs namenode --datanodes localhost:7000,localhost:7001,localhost:7002 --block-size 10 --replication-factor 2
```

Now, we are good to try using the client to do the file keeping and fetching operations (let's try with the readme file):

<a id="code-snippet--testing client"></a>
```shell
./godfs client --namenode localhost:9000 --operation put --source-path ./ --filename README.md
# 2020/08/08 18:08:51 NameNode to connect to is localhost:9000
# 2020/08/08 18:08:52 Put status: true

./godfs client --namenode localhost:9000 --operation get --filename README.md
# 2020/08/08 18:09:00 NameNode to connect to is localhost:9000
# 2020/08/08 18:09:00 Get status: true
# FILE CONTENTS ...
```


### Containerized through Docker Compose {#containerized-through-docker-compose}

In the `docker-compose.yml` file, we try to define the DataNode and NameNode as independent services and the requested number of instances of the same will be spawned up. We have individual `Dockerfile` s for the DataNode and NameNode.

Assuming we have Docker set up in the host system, we have to build the images first:

<a id="code-snippet--building docker images"></a>
```shell
docker build -t datanode -f daemon/datanode/Dockerfile .
docker build -t namenode -f daemon/namenode/Dockerfile .
docker build -t client -f daemon/client/Dockerfile .
```

Now we can initiate a desired number of containers for DataNode and a single container for NameNode as:

<a id="code-snippet--booting the composed containers"></a>
```shell
docker-compose up --scale datanode=6 --remove-orphans --force-recreate
```

Next, we would need a client in the same network to test out requests:

<a id="code-snippet--interacting through a client container"></a>
```shell
docker run -it --network host client
```

> TODO: Here we have allowed the DataNode containers to run within the **host** network, i.e. its processes are now exposed to the host. We need some more sophistication in the isolation here.

Either way of testing, to test the end-to-end working of the system, we not only want `GET` Success, but also want to understand when such a DFS can fail. We can fetch the metadata from the NameNode on where all the blocks of a given file are kept. So, theoretically, if `replication-factor` is 2 and we identify those 2 DataNodes for a particular file BlockId, we can then experiment with the edge cases of distributed systems by killing those two containers. And then we should no longer be able to fetch the complete file (since a part of it does not exist in any of the data nodes). If practice matches the above theory, we are good to go :)!
