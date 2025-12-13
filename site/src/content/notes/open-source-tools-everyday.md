---
title: "My everyday tooling around OSS"
date: 2021-01-03
tags: ["open-source", "emacs"]
draft: false
---

> Speed and efficiency are two different things. ~Rasheed Ogunlaru

We as engineers love streamlining our workflows. It all boils down to the sheer need and desire for greater control and visibility. In a utopian world, how we think of [DAOs](https://en.wikipedia.org/wiki/Decentralized_autonomous_organization) is the same way we think of our workflows in the real world. The term workflows I'm using could essentially be as simple as cleaning junk (yeah, those donotreply promotional) emails to setting up a blog publishing pipeline. The task themselves might sound trivial, but the point here is how idempotent or how scalable the workflow is. Asking questions like "What if I have to manage cleaning a few hundred inboxes tomorrow?" should clarify the problem in hand more.

And therefore, this writeup talks on tools and mindsets around setting up such workflows through computer programs.

## What's in a text editor?

I used a handful of text editors so far, and honestly, Emacs was the first editor which encouraged (read *required*) me to read one full [book](https://www.goodreads.com/book/show/25587882-mastering-emacs) while getting started with it! Text editing had never been such fun and personalized before. And within weeks I found myself to be using Emacs on window mode (minimalist me who runs stuff right in the terminal -_-), ditching JetBrains for lsp-mode, plaintext notetaking in org-roam, trading in Chromemacs for vimium and daringly writing simple elisp functions.

I'm no text ninja yet, but my overall productivity on the keyboard has increased by folds and maintaing such an extensible editor by creating workflows of my choice has been a blessing in 2020. I now launch projectiles, ripgrep instead of grep, magit instead of git, org-roam instead of notion, ox-hugo instead of notablog and of course it's aM-xing! I thought you'd ask, but now I also [vimgolf](http://www.vimgolf.com/) in emacs for fun ;).

My trajectory in Emacs has just started, and to make the start smooth I went ahead with [doom](https://github.com/hlissner/doom-emacs) with no evil (no pun intended, the original Emacs keybindings got me right in the feels). To reverbate with the community, I truly found Emacs to be *thermonuclear word processor*.

### What I type is what you see

It is now 2021 and I have decided to be a full-time Emacsian. This means that the "texts" I edit furthur would most probably be written in Emacs itself. In the past, I have experimented with blogg-struggl-ing with raw html-css based blogs with manually maintained indexing and navigation, Notion-as-CMS with notablog (quite an impressive project, check it out). For me, private notetaking and public blogging had never converged before I came across [Roam Research](https://roamresearch.com/). And with its pricing, came a slew of open-source alternatives of which [org-roam](https://github.com/org-roam/org-roam) fit my bill finally. The community has left no stone unturned, and thus with org-roam, we have [ox-hugo](https://github.com/kaushalmodi/ox-hugo) as the transport protocol to web publishing. I chose the [Er](https://github.com/lingxz/er) theme thinking it'd be pleasing to my readers' eyes (is it?). The figure below would help you figure out how much I literally mean the phrase "Written and published right from Emacs Org-mode.":

![Blog publish flow - seamless, isn't it?](/images/blog_publish_flow.png)

## First we shape our tools, thereafter they shape us

With so much of Emacs bragging, my love towards **extensible, configurable and idempotent** behaviour of tools might be somewhat clear to you. And tada, with that we'd now cover an alternative approach to maintaining dotfiles and provisioning personalized systems really fast.

### My dotfiles setup

Dotfiles are no longer fancy, and so is mine. However, I try to cover the configuration files of most of the applicable softwares I use. While having fish, doom, vim, tmux etc in one's dotfile is a no-brainer, I also keep my backup systems (which includes scripts and their schedules) checked in. Sadly on macOS, there are more mature tools than `cron` thus breaking Linux compatibility.

You can take a look at my [dotfiles](https://github.com/rounakdatta/dotfiles), they are very minimalistic.

### Set them up with ansible

We all used hacky dotfile bootstrapping scripts which had to be maintained, cleaned and generic-ized again and again. However, with ansible, stuff becomes much more easier and streamlined. Idempotency, unit tests, configurability, you name it!

And I use my ansible playbooks not only for symlinking dotfiles, but most importantly for installing, configuring softwares (from source, from release binaries, from app stores, you name it!). Thanks to my password-store setup, I now can plug my passwords into environment variables and put them on a public git repository like this.

You'll definitely want to look at and make good use of my [computer.setup](https://github.com/rounakdatta/computer.setup). If the aforementioned sound quite new (and exciting) to you, let's start with some gentle Ansible storytelling [here](https://opensource.com/article/19/9/ansible-documentation-kids-laptops), followed by some [war stories](https://rgoswami.me/posts/prov-dots/). Developers generally make use of this swiss knife Ansible to provision servers (read installing software on auto-pilot) with pre-baked images as well as patches (generally coupled with Terraform) in plain simple YAML.

## Privacy comes at a price

And we pay the price once by upskilling, or every month by not. I've always been skeptical about handing over my passwords to a browser's internal cloud (i.e. giving it the authority to store passwords on their end in exchange of super-convenience). They suck because not only it's a browser lock-in, but also they say no to custom password rules/length, multi-password-same-domain and many more novel ideas around password management. [pass](https://www.passwordstore.org/) is a sweet, simple UNIX-philosophy command-line manager to the rescue. Not only does it tactfully solve the above issues, it also has built a fantastic ecosystem around itself with [gopass](https://www.gopass.pw/), [pass-update](https://github.com/roddhjav/pass-update) to name a few.

With tools like [gopass](https://github.com/gopasspw/gopass) and [gopassbridge](https://github.com/gopasspw/gopassbridge), its a simple, multi-browser-compatible flow of passwords with my setup backed up regularly at a remote private [tombed](https://www.dyne.org/software/tomb/) git repository.

Did I forget to tell you that the awesome [Android app](https://github.com/android-password-store/Android-Password-Store) by [Harsh](https://twitter.com/msfjarvis) has app-level autocomplete and git synchronization support built in?

Did I also forget to tell you that I contributed back to [gopassbridge](https://github.com/gopasspw/gopassbridge/pull/177) and the [Android app](https://github.com/android-password-store/Android-Password-Store/pull/1091)?

## Organizing finance, knowledge

All the while we've been sharpening the tools we'd work with everyday. Now, with everyday the most organizational pain could be personal finance and knowledge. Yes, we've covered another self-hosted software Firefly and the hacks around it in a [different blog post](/notes/firefly). And we definitely can do better with GNUCash for other fast-moving investments tracking. Local GNUCash client + remote database is my favourite setup.

When it comes to bookmarks management, its again in general a case of browser lock-in. If not lock-in, it could be poor, hacky synchronization strategies. Ideally, bookmark manager should be an independent software module, and [buku](https://github.com/jarun/buku) does its job nicely here. buku also has a good webserver (which can preferably run locally on demand) for the data analyst within you!

## Files - the most important ones

All files are important, but those which act as bonafide, memoir or personal spreadsheets/documents are important with somewhat greater magnitude. The average person uses Google Drive or the equivalents to not lose visibility of their files. With worryingly powerful full-text search, it's unclear how much privacy we are trading off for the convenience. And therefore, with some effort, I've managed to setup Backbaze B2 as my backup solution for important documents. They provide generous free limits and full revision history and [rclone](https://rclone.org/) has good support for it. Thus, even though my backups are once-a-day-batch and B2 lacks a good mobile client, the privacy balance has been quite fruitful for me. Backblaze B2 APIs are S3 compatible, and therefore Android clients like [FolderSync](https://play.google.com/store/apps/details?id=dk.tacit.android.foldersync.lite) make the cut well! ;)

As a closing thought, please feel free to let me know if any of the sections seem not-said-enough. Most of the config/scripts/design in this context is open-source and invites improvement of any kind.

If this post made you think differently today, let us thank the reviewer [Rounak Vyas](https://rounakvyas.me/) and check out his amazing and witty writings.
