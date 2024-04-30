+++
title = "Alexander Nixinton"
author = ["Rounak Datta"]
date = 2024-04-19T00:00:00+05:30
tags = ["setup", "open-source", "nix"]
draft = false
+++

We are at yet another article about [Nix](https://nixos.org/) - it is a casual attempt to walk you through how it is to use Nix everyday. I also intend to put my two cents into why most people like staying away from it, why a handful are happily sacrificing their weekends over it, and why some blokes are just willing to silently ride the wave. As the homepage says, Nix is both your programming language and the framework. The pitch is that if you're building and maintaining software for a long-ish term, then you'd like to minimize surprises and keep some old gears rotating as if for ever. Packaging using Nix sorta guarantees that. Yes, and the other niceties like being "declarative" are great, but seemingly many people don't deeply care about that. Ultimately I'm trying to rant here on how beautiful the Nix ecosystem is, and walk you through the possibilities that could get unlocked.

As a long-time lurker on Nix-related blogposts on HN, I decided to give it a roller-coaster try last year by installing NixOS on my personal laptop. Well, while one can install Nix on an existing Linux/MacOS operating system as an application layer, however that path can be deceptive to shortcuts. I wanted to be true to the declarative and immutability properties of Nix, and therefore chose the hard way.


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

    Password-store = {
      enable = true;
    };
  };
};
```

It must be wholeheartedly acknowledged that ChatGPT as well has Phind came very useful throughout the journey - not just helping me in getting familiar with the concepts, but also writing and composing small snippets of Nix programs into however I needed. My current dotfiles repository is essentially an opinionated tapestry of many other repositories handpicked via GitHub Search and the [Nix Discourse](https://discourse.nixos.org/).


### Expressing all your logic and state via Nix {#expressing-all-your-logic-and-state-via-nix}

The promise of Nix just like other infrastructure-as-code frameworks is that you declaratively define what all your need. The framework then takes care of generating the dependency graph, and chalks its way through to creating / modifying the required components as missing. The fact that in NixOS you can rollback to _any_ past state (including the Linux kernel) is mindblowing! One also should take a moment to appreciate how vast and wholesome the [Nixpkgs](https://search.nixos.org/packages) repository is - often you'd be mildly surprised at how the rarest of rare packages has landed up on Nixpkgs (and very often with first-class support for `aarch64-darwin` i.e. Apple Silicon) - all community contributed!

<a id="code-snippet--art of Nix on NixOS"></a>
```shell
# this is how you apply your configuration to a NixOS system
nixos-rebuild switch --flake .
```

The standard pattern of managing dotfiles is to have a repository consisting of them, and then a bootstrapping program like GNU Stow or Ansible bakes them onto the system. This approach invites duplicacy when there are more than one flavours of the underlying system - one can't possibly embed an if/else logic (across say x86_64 and aarch64) into that innocent dotfile. And this is an area where Nix shines! The configuration (dotfile) and the bootstrapping framework (Nix) are fused into one, so defining logic is very straightforward. Fair to call out here that when you're "baking" your configuration dotfiles via Nix, they're immutable and cannot be directly edited. That is, one can't take a shortcut to modify configurations, and instead should build the entire system every time. A snippet follows to bring the point home:

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
        # darwin-specific command to figure out battery details
        tm_battery="♥ #(pmset -g batt)"
      ''
    else
      ''
        # linux-specific command to figure out battery details
        tm_battery="♥ #(acpi --battery)"
      ''
    );
  }
}
```


### The real world isn't so declarative and not always deterministic {#the-real-world-isn-t-so-declarative-and-not-always-deterministic}

While most software configurations are happy to work in a declarative way, you might occasionally come across odd-shaped pieces. Non-declarative patterns are considered _dirty_ in Nix, nevertheless it is supported as a concept called `activations`. One should however keep in mind that operating systems are not declarative inherently, so Nix is doing all the hard work of doing the sequential step and providing a neat declarative abstraction of that to us.

Here's a small example of what the neat declarative abstraction allows us:

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

Having said that, if your requirement is to have sequential steps, you generally achieve that via activations for specific portions something like the following snippet. Make sure to take enough care that the code block is idempotent as it would be run every time yourr configuration gets re-built.

<a id="code-snippet--the art of defining activations"></a>
```nix
  home.activation = {
    doomEmacs = ''
      DOOM="$HOME/.emacs.d"

      if [ ! -d "$DOOM" ]; then
          mkdir -p "$DOOM"
      fi
      cd $DOOM

      export PATH="${config.home.path}/bin:$PATH"

      git init
      if git remote | grep -q origin; then
          git remote set-url origin https://github.com/doomemacs/doomemacs.git
      else
          git remote add origin https://github.com/doomemacs/doomemacs.git
      fi

      git fetch origin
      git pull origin master
      ...
    '';
  };
```


## Emerging victorious and onto the next - iMountains and iValleys {#emerging-victorious-and-onto-the-next-imountains-and-ivalleys}

The months-long experiment with Nix on my personal laptop was a rewarding success, and that called for the next step - _using Nix in production a.k.a at work_. There's this lovely community-maintained project [nix-darwin](https://github.com/LnL7/nix-darwin) which allows you to achieve a somewhat similar setup, albeit via the application layer. Unlike NixOS where you could literally rollback upgrades to your kernel and is fool-proof-declarative, on nix-darwin you can manage all your application installations, your configuration dotfiles as well as many macOS settings. Impressively, nix-darwin supports Homebrew as well as mas (Mac Apple Store) application installations. Sure, one can't configure disk partitions, macOS upgrades and initial manual steps (like logging in to Apple account) using nix-darwin, but that's a trade-off worth living with.

<a id="code-snippet--art of Nix on Mac"></a>
```shell
# this is how you apply your configuration to a macOS system
darwin-rebuild switch --flake .
```


## Nixy Science {#nixy-science}


### Development environments and short-lived environments {#development-environments-and-short-lived-environments}

Nix development environments (as well as shells) are one of the most impressive things to happen out of the immutability properties of the system. On a single occasion, I needed the Wireshark program for a day or two, and all I had to do was `nix-shell -p wireshark`. All the user-data produced by that program gets gracefully garbage-collected once you've exited that temporary shell. One no longer doesn't have to deal around with different versions of the JRE, or confusingly-installed global npm packages.

And while nix shells are more for ad-hoc purposes, one can carefully craft Flakes for specific projects which would serve as the development environment template. Flakes can lock in the versions of each package, so they don't outdate with time. Last year, I attempted [Advent of Code](https://adventofcode.com/) in OCaml and decided to try out Nix development environments - super impressed!

<a id="code-snippet--art of nix develop"></a>
```nix
{
  description = "AOC OCaml programming environment presented to you by Nix";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
	ocamlEnv = with pkgs.ocamlPackages; [
	  ocaml
	  utop
	  dune_3
	  findlib
	  ocaml-lsp
	  ocamlformat
	];
      in
      {
        devShell = pkgs.mkShell {
	  buildInputs = ocamlEnv ++ [ pkgs.opam ];
	  shellHook = ''
	    export IN_NIX_DEVELOP_SHELL=1

            export OPAMROOT=$NIX_BUILD_TOP/.opam
	    # unsetting the below env var is required for fixing a thorny issue with `num` install
	    # similar issue & solution thread: https://github.com/ocaml/Zarith/issues/136
	    unset OCAMLFIND_DESTDIR

	    opam init --bare --disable-sandboxing -y --shell-setup -vv
	    opam option -global depext=false
	    OCAML_VERSION=$(ocaml --version | awk '{printf $5}')
	    opam switch create $OCAML_VERSION
	    eval $(opam env --switch=$OCAML_VERSION)
	    opam install . --deps-only -y -v

	    # figure out what the default shell of this computer is and set it
            SHELLY=$(getent passwd $USER | awk -F: '{printf $7}')
	    exec $SHELLY
	  '';
	};
      }
    );
}
```


### Secrets management {#secrets-management}

This is an area which is still work-in-progress for me. There exists great tooling like [sops-nix](https://github.com/Mic92/sops-nix), [agenix](https://github.com/yaxitech/ragenix) for injecting secret values into your Nix project. Common use cases might be auto-configuring API keys, setting up your private keys at the required paths, bootstrapping local database client and local password store and so on. The best thing about this declarative design is that your secrets would be encrypted and [tombed](https://dyne.org/software/tomb/) on-device, and you can conveniently commit them to git.


### Endless automation {#endless-automation}

Nix offers the scope for endless automation - behold your imaginations! You could write simple scripts and then tie them on to `launchd` / `systemd` to run them periodically and what not. Writing scheduled scripts on UNIX have existed since forever, but the ability to confidently deploy them using Nix on personal computers is something that's impressively an emerging capability to me. Nix brings to personal computers what Packer / AWS AMIs brought to server computing.

I have a self-hosted software called [Snibox](https://github.com/snibox/snibox) to collect snippets of code / programming wisdom as I come through. There's yet another self-hosted software called [Memoet](https://github.com/memoetapp/memoet) which I use to write flash cards about things I want to remember in the longer term. Well, given Snibox doesn't provide a straightforward API and therefore a clever way might be to do some browser scripting. Scripting on the browser and dealing with fresh cookies is something that's possible only on a personal computer where the user is actually logged in - and there's where Nix comes into the picture. To get more clarity on how exactly this is done, you can take a look at this [pull request](https://github.com/rounakdatta/dotfiles/pull/23/files).


## Closing thoughts {#closing-thoughts}

There's no denying of the learning curve of Nix, and one must give enough time test driving before starting to use it in day-to-day work. The reward is in the longer term, as more and more of your workflows are driven by Nix. Eventually, it just fades into the background and _keeps doing its job faithfully_. If you're setting up your Nix dotfiles repository and would need guidance, I'd be happy to help over email!

<div class="github-card" data-github="rounakdatta/dotfiles" data-width="400" data-height="150" data-theme="default"></div>
<script src="//cdn.jsdelivr.net/github-cards/latest/widget.js"></script>
