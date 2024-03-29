+++
title = "PagerDuty for Things - An interesting IoT project"
author = ["Rounak Datta"]
date = 2019-10-13T00:00:00+05:30
tags = ["iot", "esp32", "golang", "arduino", "ionic"]
draft = false
+++

An interesting project we worked on being at college was building a PagerDuty-like watchdog for monitoring physical things' state. And the implementation of choice was **liquid level**.


## What's up {#what-s-up}

The project is all about an integration effort of an ESP32-connected weight detection machinery to an online service to unlock possibilities like remote monitoring and alerting. To elucidate, think of remotely monitoring your gas cylinder's fuel level and getting alerted whenever the level drops below a custom-defined threshold.

The project consists of 3 independent network-connected modules:

-   **ESP32 Module**: Consists of a weight measurement component (HX711); thereby collects the weight information at regular intervals and publishes them to the remote server through an API.
-   **Server and Data Module**: Responsible for persisting data in a database and processing them upon CRUD requests. Exposes an API to which the ESP32 and the application connect.
-   **Application Modules**: Essentially a client application (Android, iOS, web or whatever) which allows for user input, monitoring and alerting. Provides interfaces for initializing tracking of a new fuel container, setting a custom condition-based alert, displays level information, receives push notifications upon condition being satisfied.


## Digging deep into the hardware architecture {#digging-deep-into-the-hardware-architecture}


### How do we measure the weight {#how-do-we-measure-the-weight}

A **load cell** is a simple piezo-electric device which is designed to measure pressure (or more precisely changes in pressure) through it's _bend ratio_. Upon change of weight of the payload, the bend change is captured in terms of changes in the electrical signal proportionally. Therefore once we calibrate the load cell to find its "factor" against a standard weight, any weight within the manufacture range can be quite precisely measured applying simple ratios. Now, **HX711** is a simple amplifier magnifying this electrical input from this load cell thereby making it available to boards to interpret and process it furthur. We experimented with collecting the results on both Arduino Uno and ESP32.

{{< figure src="/ox-hugo/loadcell_hx711_arduino.png" caption="<span class=\"figure-number\">Figure 1: </span>Connection of load cell -&gt; HX711 -&gt; Arduino" >}}

{{< figure src="/ox-hugo/loadcell_hx711_esp32.png" caption="<span class=\"figure-number\">Figure 2: </span>Connection of load cell -&gt; HX711 -&gt; ESP32" >}}

<a id="code-snippet--hx711 pin configuration"></a>
```nil
HX711 - input:
- Upper left load cell signal (red wire) => HX711 E- pin
- Lower left load cell signal (red wire) => HX711 A+ pin
- Upper right load cell signal (red wire) => HX711 A- pin
- Lower right load cell signal (red wire) => HX711 E- pin

HX711 - output:
- HX711 Vcc pin => ESP32 3.3V pin
- HX711 GND pin => ESP32 GND pin
- HX711 SCK pin => ESP32 GPIO 2 (pin D9)
- HX711 DT pin => ESP32 GPIO 5 (pin D8)
```


## Pinning the hardware setup all together {#pinning-the-hardware-setup-all-together}


### Load cell assembly {#load-cell-assembly}

The load call would support a weight plate on one of its ends perpendicular to its length; while other end would be fixed to a base.
![](/ox-hugo/loadcell_assembly.png)


### Using Arduino Uno as the driver {#using-arduino-uno-as-the-driver}

{{< figure src="/ox-hugo/complete_setup_arduino.jpg" caption="<span class=\"figure-number\">Figure 3: </span>First try, when connected to PC, the healthy Arduino didn't respond correctly :(" >}}


### Using ESP32 as the driver {#using-esp32-as-the-driver}

{{< figure src="/ox-hugo/complete_setup_esp32.jpg" caption="<span class=\"figure-number\">Figure 4: </span>My working setup" >}}

{{< figure src="/ox-hugo/hx711_esp32_connection.png" caption="<span class=\"figure-number\">Figure 5: </span>HX711 -&gt; ESP32 connection diagram (WARNING! Please ensure that the 3.3V and GND are connected correctly, they are WRONGLY swapped in the image)" >}}


## Programming the ESP32 {#programming-the-esp32}

We write good old C to design the logic of how and what the ESP32 wants to do. Our ESP32 needs individual modules - for obtaining and parsing wireless networks available, sending and receiving data over BLE (Bluetooh Low Energy) to the client, connecting to a wireless network when commanded with credentials, utilizing EEPROM to remember actions even in sleep and finally making `GET` and `POST` requests to the remote service. And extra care has to be taken to prevent the low-key machine from getting overwhelmed (maintaining wireless and Bluetooth connections at the same time is not less CPU intensive!).


## Setting up the remote service, database and the data {#setting-up-the-remote-service-database-and-the-data}

The remote data-keeper-and-processor is a tiny, light Golang service which organizes all the data for registered devices, scheduled notifications, liquid levels etc and is responsible for pushing the notifications down to the clients, thus completing the chain. There is also small share of intelligence built into the system to predict device downtimes (poor network), regressing upon the time-vs-level curve to detect accidental scenarios.


## The app in user's hand {#the-app-in-user-s-hand}

The application was built as hybrid-platform Ionic framework-based. With TypeScript magic, we are able to seamlessly allow the user find and connect to a new ESP32 device nearby, help the ESP32 get connected to the internet through BLE-talking and finally peace-of-mind monitoring remotely. Users are allowed to set multiple custom notifications based on levels.

{{< figure src="/ox-hugo/application_mock.png" caption="<span class=\"figure-number\">Figure 6: </span>Mock screens for the application" >}}


## Furthur discussions {#furthur-discussions}


### How do you set up a new gas cylinder device? {#how-do-you-set-up-a-new-gas-cylinder-device}

To start monitoring the newly fitted ESP32-connected gas cylinder, we need to help that ESP32 connect the network (obviously through WiFi). To help it connect to WiFi, we have one obvious option:

-   ~~Hardcode the WiFi SSID and password into the ESP32 source code (stupid)~~
-   Send it over some medium from the client to the ESP32

And, to accomplish this, we use Bluetooth Low Energy (BLE) to establish the connectivity between the client (say the phone here) and ESP32. So we come quite closer to the ESP32 (maximum range of BLE is 100m). This is a beautiful part in itself as the ESP32 then helps us see which all wireless networks it can see. And then we choose the network and send the SSID and password serially to the ESP32 which should next remember them in its flash memory (some boilerplate code [here](https://gist.github.com/rounakdatta/345964a13fe3b3b77fab2a11eaaaa5ab)). So, the ESP32 now can connect the network 🙂.


### What's the logic of level-based alerting? {#what-s-the-logic-of-level-based-alerting}

The app provides the interface to input a custom level at which the user wants to be alerted - could be say 75% or 33% or 1%. We need to address multiple challenges here:

-   A user might have set up multiple gas cylinders against a single account, and we'd have to send the notification of each of the owned devices to the same phone
-   How frequently should the modules poll amongst each other? How closely should the ESP32 update the remote server about the weight measured? How soon should the app check back from the server whether it has crossed the threshold or not?
-   Based on this frequency of polling, how do we ensure that the level doesn't get missed from being recorded (say the level falls too rapidly), also how do we maintain a state of whether a custom alert notification has been successfully delivered or not?


### What are some possibilities and optimizations to look at? {#what-are-some-possibilities-and-optimizations-to-look-at}

-   Potentially building a logic to make sure the server and ESP32 _learns_ how frequently to poll for data. This helps optimize scale to a judicious API callout.
-   How do we handle reads (load cell or HX711 misbehaving) or stale data (ESP32 offline)?
-   Building a marketplace around the concept, what if the app could automatically book a refill from a local vendor!
