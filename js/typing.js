$(function(){
  /*
  Pick randomly from subtitles
  */
  var subtitles = [
  " I'm 20! It's just the beginning of youth! ^1000 Best time for Entrepreneurship! ^1000 the Best time to be Alive!  ^500 ! ^500 !",
  " You found me! Was it ^1000 GitHub? ^1000 or Quora? ^2000 or Facebook? ^500 ? ^500 ?",
  " Either I'm typing ^1000 or on Music ^1000 or discussing Startups ^1000 or reading HN ^2000 or Sleeping ^500 💤 ^500 💤 ^500 💤"
  ];
  $(".element").typed({
    strings: ["", subtitles[Math.floor((Math.random() * subtitles.length))]],
    typeSpeed: 20,
    backDelay: 500,
  });
});


  var b = window.baffle('h1', 
    {
      characters: 'b6c7807bb10b5d867000',// ▓░█ ▒░▒▓░ ▒░░▓> ▒█▓ █░><▒ █▒█▓ ▓░/ ▓▓/█ █▓▒', 
    speed: 50
  });
  b.start().once().reveal(500, 500);