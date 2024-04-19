+++
title = "Alexander Nixinton"
author = ["Rounak Datta"]
date = 2024-04-19T00:00:00+05:30
tags = ["setup", "open-source"]
draft = false
+++

The following is an article about [Nix](https://nixos.org/) and an attempt is to put my two cents into why most people like staying away from it, why a handful are happily sacrificing their weekends over it, and why some blokes are just willing to silently ride the wave. As the homepage says, Nix is both your programming language and the framework. The pitch is that if you're building and maintaining software for a long-ish term, then you'd like to minimize surprises and keep some old gears rotating as if for ever. Packaging using Nix sorta guarantees that. Yes, and the other niceties like being "declarative" are great, but seemingly many people don't deeply care about that.

_The article is neither about Alexander Hamilton, nor about Alexander Nix. Any correlation to their greatness or sophistications are purely coincidental._

As a long-time lurker on Nix-related blogposts on HN, I decided to give it a roller-coaster try last year by installing NixOS on my personal laptop. Well, one can install Nix on an existing Linux/MacOS operating system as an application layer, however that path can be deceptive to shortcuts. I wanted to be true to the declarative and immutability properties of Nix, and therefore chose the hard way.


## The first leap into the valley of despair {#the-first-leap-into-the-valley-of-despair}


### Brewing fresh, hot, cutting (edge) NixOS on my personal laptop {#brewing-fresh-hot-cutting--edge--nixos-on-my-personal-laptop}

The enthusiastic journey of installing NixOS (not really unexpectedly) landed into a valley of despair for me. One needs to speak the Nix language, somewhat understand the build process and pick up the right constructs of organizing the setup script - all at the same time. By setup script, we mean the codebase which initially would bootstrap your system, and which ultimately evolves into your all-encompassing dotfiles repository. The core Nix framework is stable, but decisions on whether to choose the new Flake way of packaging or the legacy way of packaging are some decisions that have to be well thought through. Truth to be told, I initially had decided to go with the [Hyprland](https://github.com/hyprwm/Hyprland) window manager, but that route cost me almost half of a Saturday. Plain, old GNOME (as always) came to my rescue. The lesson is that, while trekking a new, steep mountain, always find that base camp first, and attempt all adventures from there, so that backtrackings are less painful.

At this juncture it is also worth mentioning the project home-manager, which allows you to configure your user directory with a lot of ease. You get to carefully choose which all programs are to be installed at a system level, and which all are to be installed specific to user. Here's a snippet to describe how elegant it is to configure most of your daily use programs. The `home` block enclosing signifies that these settings indeed would be specific to a particular user.

<a id="code-snippet--the art of enabling programs"></a>
```nix
home = {
  programs = {
    htop = {
      enable = true;
      settings.color_scheme = 6;
    };

    password-store = {
      enable = true;
    };
  };
};
```

It must be wholeheartedly acknowledged that ChatGPT as well has Phind came very useful throughout the journey - not just helping me in getting familiar with the concepts, but also writing and composing small snippets of Nix programs into however I needed. My current dotfiles repository is essentially an opinionated tapestry of many other repositories handpicked via GitHub Search and the [Nix Discourse](https://discourse.nixos.org/).


### Expressing all your logic into Nix {#expressing-all-your-logic-into-nix}

The promise of Nix just like other infrastructure-as-code frameworks is that you declaratively define what all your need. The framework then takes care of generating the dependency graph, and chalks its way through to creating / modifying the required components as missing. One also should take a moment to appreciate how vast and wholesome the [Nixpkgs](https://search.nixos.org/packages) repository is - often you'd be mildly surprised at how the rarest of rare packages has landed up on Nixpkgs (and very often with first-class support for `aarch64-darwin` i.e. Apple Silicon) - all community contributed!

The standard pattern of managing dotfiles is to have a repository consisting of them, and then a bootstrapping program like GNU Stow or Ansible bakes them onto the system. This approach invites duplicacy when there are more than one flavours of the underlying system - one can't possibly embed an if/else logic (across say x86_64 and aarch64) into that innocent dotfile. And this is an area where Nix shines! The configuration (dotfile) and the bootstrapping framework (Nix) are fused into one, so defining logic is very straightforward. A snippet follows to bring the point home:

<a id="code-snippet--the art of defining logic"></a>
```nix
{ configs, pkgs, ... }:
let
  isDarwin = pkgs.stdenv.isDarwin;
in
{
  programs.tmux = {
    enable = true;
    extraConfig = ''
        set ...
        # all your over-engineered tmux configs go here
        set ...
    ''
    +
    (if isDarwin then
      ''
        # darwin-specific setting
        tm_battery="#[fg=$base0F,bg=$base00] ♥ #(pmset -g batt | grep InternalBattery | awk '{print $3}' | sed 's/;$//')"
      ''
    else
      ''
        # linux-specific setting
        tm_battery="#[fg=$base0F,bg=$base00] ♥ #(acpi --battery | awk \'{gsub(\",\", \"\"); print \$4}\')"
      ''
    );
  }
}
```


### The real world isn't so declarative and always deterministic {#the-real-world-isn-t-so-declarative-and-always-deterministic}

While most software configurations are happy to work in a declarative way, you might occasionally come across odd-shaped pieces. Non-declarative patterns are considered _dirty_ in Nix, nevertheless it is supported as a concept called `activations`. One should however keep in mind that operating systems are not declarative inherently, so Nix is doing all the hard work of doing the sequential step and providing a neat declarative abstraction of that to us.

Here's a small example of what the neat abstraction allows us:

```nix
programs.gpg = {
  enable = true;
}

services.gpg-agent = {
  enable = true;
  pinentryFlavor = "gnome3";
  enableSshSupport = true;
}
```

While if you peek into the [internals](https://github.com/nix-community/home-manager/blob/master/modules/programs/gpg.nix), it might be doing all the heavylifting something like this:

```nix
    home.activation = {
      createGpgHomedir =
        hm.dag.entryBetween [ "linkGeneration" ] [ "writeBoundary" ] ''
          run mkdir -m700 -p $VERBOSE_ARG ${escapeShellArg cfg.homedir}
        '';

      importGpgKeys = let
        gpg = "${cfg.package}/bin/gpg";

        importKey = { source, trust, ... }:
          # Import mutable keys
          optional cfg.mutableKeys "run ${gpg} $QUIET_ARG --import ${source}"

          # Import mutable trust
          ++ optional (trust != null && cfg.mutableTrust)
          ''run importTrust "${source}" ${toString trust}'';

        anyTrust = any (k: k.trust != null) cfg.publicKeys;

        importKeys = concatStringsSep "\n" (concatMap importKey cfg.publicKeys);
```
