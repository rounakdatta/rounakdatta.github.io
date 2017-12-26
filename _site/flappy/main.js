var mainState = {
	preload: function() { 

		game.load.image('bird', 'assets/bird.png'); //bird image loaded 
		game.load.image('pipe', 'assets/pipe.png') //pipe image loaded
		game.load.audio('jump', 'assets/jump.wav'); //jump sound loaded

		game.load.image('background', 'assets/day.png'); //background image
	},

	create: function() { 

		this.background = this.add.tileSprite(0,0, this.world.width, this.world.height, 'background'); //classic background

		//game.stage.backgroundColor = '#71c5cf'; //background set as blue

		game.physics.startSystem(Phaser.Physics.ARCADE); //load the physics engine

		this.bird = game.add.sprite(100, 245, 'bird'); //coordinates where the bird needs to be set initially

		game.physics.arcade.enable(this.bird); //bird is given life (nah physics only)

		this.bird.body.gravity.y = 1000; //gravity must attract all

		this.bird.anchor.setTo(-0.2, 0.5); //change the axis of rotation of the bird

		var spacekey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR); //define spacekey as the even of pressing the SPACEBAR
		spacekey.onDown.add(this.jump, this); //spacekey when buttoned down, bird will jump

		this.pipes = game.add.group();

		this.timer = game.time.events.loop(1500, this.addRowOfPipes, this); 

		this.score = 0; //score variable
		this.labelScore = game.add.text(20, 20, "0", 
    		{ font: "30px Arial", fill: "#ffffff" }); 

		this.jumpSound = game.add.audio('jump'); 
	},

	update: function() {
 
		if(this.bird.y < 0 || this.bird.y > 490)
			this.restartGame(); //why is bird going out of my screen

		game.physics.arcade.overlap(this.bird, this.pipes, this.hitPipe, null, this); //losing overlap logic here

		if(this.bird.angle < 20)
			this.bird.angle += 1 //slowly get horizontal
	},

	jump: function() {

		if (this.bird.alive == false) //no jumping if you are dead
    		return;

		this.bird.body.velocity.y = -350; //jumping gives a vertical velocity to the bird in upward direction

		this.jumpSound.play(); 

		var animation = game.add.tween(this.bird);

		animation.to({angle: -20}, 100); //slowly in 100ms tilt the bird

		animation.start();
	},

	hitPipe: function() {

	    if (this.bird.alive == false)
	        return;

	    this.bird.alive = false;

	    game.time.events.remove(this.timer);

	    this.pipes.forEach(function(p){
	        	p.body.velocity.x = 0;
	    	}, this);
	}, 

	restartGame: function() {
		game.state.start('main');
	},

	addOnePipe: function(x, y) {
		var pipe = game.add.sprite(x, y, 'pipe'); //create a new pipe at (x, y)

		this.pipes.add(pipe);

		game.physics.arcade.enable(pipe);

		pipe.body.velocity.x = -200; //pipes logically move left

		pipe.checkWorldBounds = true; //check if object within game world (area yeah)
		pipe.outOfBoundKill = true; //kill the object if its outside the world
	},

	addRowOfPipes: function() {
		var hole = Math.floor(Math.random() * 5) + 1;

		for(var i = 0; i < 8; i++)
			if(i != hole && i != hole + 1)
				this.addOnePipe(400, i * 60 + 10);

		this.score += 1; //so score logically increases whenever a new row of pipes is added :-/ s = ut
		this.labelScore.text = this.score;  
	},
};

var game = new Phaser.Game(400, 490);

game.state.add('main', mainState); 

game.state.start('main'); //start here