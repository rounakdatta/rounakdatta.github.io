+++
title = "Just setting up my homelab"
author = ["Rounak Datta"]
date = 2023-02-18T00:00:00+05:30
tags = ["self-hosting", "hobby", "productivity"]
draft = false
+++

Over the last few years, I've been obsessively reading on responsible technology and information warfare. My favourites in this space have been [Permanent Record](https://www.goodreads.com/book/show/46223297-permanent-record) and [Mindf\*ck](https://www.goodreads.com/en/book/show/52269471). The hobby of homelabbing and having control over my own data originates somewhere around that. I had earlier [written about](/posts/firefly) why I think Firefly-III helped me achieve the "personal" in personal finance. The joy of running a server 24x7 in your living room is mostly about cultivating value from custom-built software. Although most of what we run is off-the-shelf OSS projects, however the extensions and close-knit integrations between them is where the magic happens. As with every hobby, running a homelab is a journey - it is never perfect, but always better than before.


## Tales of my homelab journey {#tales-of-my-homelab-journey}


### One small drop in the ocean, one giant leap for ambition {#one-small-drop-in-the-ocean-one-giant-leap-for-ambition}

I took my first attempt at it during my undergraduate years - it was a tiny 1GB DigitalOcean droplet which ran just a couple of applications. With no hardware to worry about, all of the worry went into thinking how my long wishlist of items would even fit into that one gig! Although containerization was picking up rapidly at that time, I amusingly chose to compile binaries right within the machine, and run them as `systemd` services. I know you wouldn't believe, but there was a time when I'd be lazy to write `systemd` service configuration files and instead run it inside a detached `tmux` session. There would never be the need to restart the droplet, and we were high on hopes that the `tmux` sessions would never die! The cloud game is fun, with easy public IPv4 and all, but upgading to a high-spec droplet was kinda unaffordable as a college student. The droplet had its good times with some of my friends also deploying hobby applications to it - but needless to say, scaling up hardware was the need of the hour.


### The Homelab - Bring Him Home {#the-homelab-bring-him-home}

As I was progressing in my career, organically came the need to track/juggle multiple tasks, and getting reminded of them at the right times. I found myself re-experimenting with TODO managers. With the same FOSS philosophy in mind, I wanted something that's hackable, cross-platform and nifty. Stumbling upon [Vikunja](https://vikunja.io/), I immediately knew _this_ is what I needed. Again around December 2021, we went for a [Himalayan trek](/posts/himalayan-trek) Back from the mountains, we had to create a shareable (web) gallery of all our scenic photos and vlogs. DSLR and GoPro media was too big to fit on the Google Photos / Drive free plan. And that called for a better plan. It's funny to draw these connections, but these were the signals of evolution. Taking opinions from my friends, we thought of going ahead with products like [Nextcloud](https://nextcloud.com/) or [Photoprism](https://www.photoprism.app/) (both of which are self-hosted photo/video sharing products). I decided that it was the time to invest into a 8GB Raspberry Pi, and migrate the DigitalOcean droplet to the Pi. Or well, you can also rephrase as - it was finally time to bring the homelab ... home.

<a id="figure--fig:HL-0"></a>

{{< figure src="/ox-hugo/raspberry_pi.jpg" caption="<span class=\"figure-number\">Figure 1: </span>Freshly plucked Raspberry Pi" >}}

I thought I'll be able to quickly get the migration done dedicating some late nights and weekends. Also, having learnt Ansible and Infrastructure-as-Code at work, I decided to make good use of the opportunity. Conversely, _just_ migrating the sphaggeti code didn't make sense in terms of future scalability - if I were to onboard other self-hosted applications into it, I'd have to craft a systematic way of deploying and maintaining. Multiple other things like SSH access (for administration) and exposing publicly had to be figured out. Back then I did have a little experience working with Kubernetes from the past, but I wasn't really bullish on it given the operational complexity. Hashicorp Nomad came to the rescue having read about [similar](https://mrkaran.dev/posts/home-server-nomad/) [setups](https://github.com/assareh/home-lab). The Tailscale team came out with their [amazingly smooth Wireguard VPN](https://tailscale.com/blog/how-tailscale-works/) product in mid-2020, and so did the Cloudflare team with [Cloudflare Tunnels](https://blog.cloudflare.com/tunnel-for-everyone/). It does feel like the right-place, right-time - these products indeed made my life much easier! With about two weeks of hacking, I had neat subdomains ready for eight (up from three!) of my self-hosted applications. It was unbelievable that an affordable pocket Raspberry Pi had 4 vCPUs, 8GB of RAM and could run all my applications so smooth. I was initially using [UNIX Password Store](https://www.passwordstore.org/) (local) for all the deployment secrets, but with the migration to Bitwarden, GitOps (deploy on every `main` commit through GitHub Actions) was an actual thing!

<a id="figure--fig:HL-1"></a>

{{< figure src="/ox-hugo/raspberry_pi_server.jpg" caption="<span class=\"figure-number\">Figure 2: </span>Enclosed Pi server (there used to be a USB-connected HDD back then for persistent storage)" >}}


### Old drawers to the rescue {#old-drawers-to-the-rescue}

There's a psychological hope cycle when dealing with Raspberry Pi homeservers - first you tend to underestimate these tiny devices, then you keeping loading it with stuff and get amazed at how much it can get done. Unfortunately the last phase is the Pi struggling to keep up with your perceived overestimations. And of course, summer heat plays spoilersport. I soon realized that my CPU, and not memory requirements had overgrown the Pi. Coincidentally we had a "computer room" with multiple legacy desktops and laptops lying around - most of them outdated hardware. The curious in me wanted to repurpose some of them into a homelab multi-node cluster. But to headstart simple, I chose the Dell Latitude E6400 and went all-in into the migration yet again. Migration was super simple this time except the pains of `scp`-ing the huge data directory and rebuilding some container images for AMD64 (Pi was ARM64 V8).

<a id="figure--fig:HL-2"></a>

{{< figure src="/ox-hugo/dell_latitude_server.jpeg" caption="<span class=\"figure-number\">Figure 3: </span>Dell Latitude working hard in silence right on my workstation" >}}

The stint with the Dell Latitude as my homelab hardware was sweet yet short. The sweetness comes from the fact that laptops have batteries (and are hence tolerant to power outages) and a screen (which helps enormously for first-time &amp; urgent debugging scenarios). Although the Intel Core2Duo was theoretically much more performant than ARM Cortex A72, decade-old hardware is ... well, decade old. I/O intensive tasks like Photoprism video transcoding, Nextcloud, Duplicati were struggling to keep up - _the two poor cores were interrupted way too much to do any useful work_. It was clear indication that I needed to invest in modern hardware.


### A big, black box beside the couch {#a-big-black-box-beside-the-couch}

Thanks to Moore's law, hardware prices deprecates faster than their effectiveness. I was able to grab a second-hand desktop PC sporting 7th generation Intel i5 and 16GB of RAM. And finally it felt like a rocketship , just to quote it as,

> There’s a point – 7000 RPM – where everything fades. When your seeing becomes weightless, just disappears. And all that’s left is a body moving through space and time. 7000 RPM that’s where you meet it.

I don't claim to understand hyperthreading technology completely, but my benchmarking experiments showed impressive results. The luxury of having a lot of RAM meant the freedom to _move fast and deploy things_. Nextcloud synchronization, Photoprism image loading times, Duplicati backup durations showed prominent improvement. And with desktop-grade fans, finally I didn't have to worry about active cooling. Occasionally I celebrate the fact that my machine neither heats up the room, nor does it make any greater noise than an Apple Silicon Mac.

<a id="figure--fig:HL-3"></a>

{{< figure src="/ox-hugo/desktop_server.jpg" caption="<span class=\"figure-number\">Figure 4: </span>Humble yet powerful desktop server" >}}


## What's cooking in my lab {#what-s-cooking-in-my-lab}

If you happen to do homelabbing as a hobby, know that there's the on-premise advantage of it. Self-hosting essentially means that all the data gets written to a disk owned by you. And open-source software means that it is never going away unlike Google's chat apps. I tend to self-host a variety of applications from TODO apps, wiki/documentation apps, personal finance managers, file cloud, photo/video gallery and such. There's a productivity category which contains things like snippets organizer, spaced-repetition for remembering etc. Then comes the obvious media cateogy - think of self-hosted versions of Google Play Books, Audible, Netflix and so on. There's also duct-tape tools like NTFY (a cool REST interface for push notifications), Cronicle (cron on steroids), Duplicati (incremental, encrypted backups) and RSS readers. The full list of available on the [GitHub Readme](https://github.com/rounakdatta/homelab.setup#list-of-self-hosted-applications). And NO, I DO NOT SELF-HOST EMAIL.

In case you've been wondering, I've been using Ubuntu server on both the current desktop machine, as well as the past Dell Latitude laptop. And there's the very cool [DietPi](https://dietpi.com/) which I used to run on my Raspberry Pi. On container orchestration front, I'm a fan of the simple, straightforward philosophy of Hashicorp Nomad.

<a id="figure--fig:HL-4"></a>

{{< figure src="/ox-hugo/nomad_dashboard.png" caption="<span class=\"figure-number\">Figure 5: </span>An average day on the Nomad dashboad" >}}


## Learnings and what's next {#learnings-and-what-s-next}

-   Being prepared to experiment. Although my intended audience for the homelab was small (me, my family and some friends), still hosting heavy applications means that you have to have knowhow of container resource tuning and being comfortable on the command line.
-   Measuring effort-to-value ratio before an action. It is easy to get carried away by all the fancy enterprise-grade hardware and complex networking setup (we do a lot of that in [r/homelab](https://www.reddit.com/r/homelab/)). But I've always been conscious of whether at all a technical improvement will bring about a real value addition. Afterall, it isn't production software, it's a homelab with a personal touch.
-   Taking security seriously. With tools like Tailscale in the ecosystem, it is definitely easy to _have your private garden over VPN_. But still, even if we are exposing applications publicly, we must be aware of the risks of it. For example, if exposing publicly via Cloudflare Tunnels, Zero Trust Access is something to consider. Most importantly, if you're storing confidential/sensitive/objectional data in your homelab, prioritize security over convenience!
-   Introduce monitoring, but be careful about overdoing it. Not all self-hosted applications come with telemetry built in, however it is moderately important to have some kind of host monitoring set up. Afterall, you wouldn't want your system to go up in flames because of a DDOS.
-   I definitely wanted to build a distributed cluster - a fleet of machines which load-balance the compute. And a Ceph/SeaweedFS like distributed POSIX filesystem for all persistent storage requirements. While it increases reliability, it of course brings in a lot of operational complexity. Hence at the moment, it's a nice-to-have instead of a must-have.
-   Running a hardware machine 24x7 isn't trivial if your residence is prone to frequent power cuts or poor broadband internet connection. In those cases, it's justified to rent out the cloud. In the long term, cost of owning hardware will balance out cost of renting equivalent hardware. Needless to say, cloud's reliability is unmatched.
-   While Ansible does work good, it doesn't honour the spirits of functional programming. I have a long term plan to re-write my IaC in something like Nix. That doesn't give me any performance / quality improvements, but improves reproducibility and confidence to experiment without fear.

That's all for the writeup!
