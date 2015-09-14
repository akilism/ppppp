var React = require('react');
var $ = require('jquery');
var _ = require('underscore');

window.$ = $

window.TRV = {}

function initialize() {

  var layer = "toner";
  var mapOptions = {
    center: { lat: 40.71988, lng: -73.95726},
    zoom: 17,
    mapTypeId: layer,
    disableDefaultUI: true,
    scrollwheel: false,
    navigationControl: false,
    mapTypeControl: false,
    scaleControl: false,
    draggable: false,
    mapTypeControlOptions: {
      mapTypeIds: [layer]
    }
  };
  var map = new google.maps.Map(document.getElementById('map'),
      mapOptions);
  // replace "toner" here with "terrain" or "watercolor"
  map.mapTypes.set(layer, new google.maps.StamenMapType(layer));
  TRV.map = map;

  var image = {
    url: "asap-sprite.png",
    size: new google.maps.Size(280, 450),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(35, 105),
    scaledSize: new google.maps.Size(70, 112.5)
  }

  TRV.ASAP = new google.maps.Marker({
    position: {lat: 40.718940674981305, lng: -73.95652770996094},
    map: TRV.map,
    icon: image
  })

  TRV.city = {
    "bar": {
        lat: 40.719770091561315,
        lng: -73.9578366279602,
        full_name: "Trilby's Bar",
        caption: "A$AP Rocky showed up at Trilby's Bar, an old haunt from the cheek-and-jowl days of artisinal cocktail shaking. 'It's time for a Manhattan ... in Brooklyn'.",
        turned_on: true,
        unlocks: ["park"],
        after_message: "After the bar, A$AP Rocky reminisced about drinking in the park before a Vampire Weekend show at the McCarren Pool.",
        icon: {
          url: "beer-icon.png",
          size: new google.maps.Size(50, 87),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(25,80),
          scaledSize: new google.maps.Size(50, 87)
        }
    },
    "park": {
        lat: 40.72061576057116,
        lng: -73.95473599433899,
        full_name: "City Park IV",
        caption: "At 6:00 PM, I got to the park. There were dogs but the A$AP crew hadn't brought one. We were bummed that we didn't have a dog.",
        turned_on: false,
        unlocks: [],
        after_message: false,
        icon: {
          url: "dog.png",
          size: new google.maps.Size(80, 109),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(40,100),
          scaledSize: new google.maps.Size(80, 109)
        }
    },
    "club": {
        lat: 40.71924154297441,
        lng: -73.9540708065033,
        full_name: "The Bounce Club",
        caption: "The Bounce Club is always on the up or the down. A$AP Rockey reminds me of this, pushing past a bewildered bouncer, at the Bounce Club.",
        turned_on: false,
        unlocks: [],
        after_message: false,
        icon: {
          url: "tiesto.png",
          size: new google.maps.Size(150, 94),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(75,90),
          scaledSize: new google.maps.Size(150, 94)
        }
    },
    "resto": {
        lat: 40.72007908725286,
        lng: -73.95987510681152,
        full_name: "Spicee's Meatball",
        caption: "A$AP Rocky esimates that he's eaten 60 meatballs here. I estimate that to be 30 pounds of meat, an impressive number.",
        turned_on: true,
        unlocks: ["club"],
        after_message: "Dinner was filling and we were ready to dance. 'Tiesto is at the Bounce Club ... which is ... whatever'",
        icon: {
          url: "meatball-icon.png",
          size: new google.maps.Size(75, 75),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(37,60),
          scaledSize: new google.maps.Size(75, 75)
        }
    },
  }

  _.each(TRV.city,function(v,k){
    if(v.turned_on){
      var marker = {
        position: {lat: v.lat, lng: v.lng},
        map: TRV.map
      }
      if(v.icon){
        marker.icon = v.icon;
      }
      marker = new google.maps.Marker(marker)
    }
  })

  map.addListener('click', function(e) {
    console.log(e.latLng)
  })

  var pano = new google.maps.Map(document.getElementById('pano'));
  TRV.pano =  pano;
  TRV.streetView = TRV.pano.getStreetView();
  TRV.streetView.setVisible(true);
  TRV.streetView.setOptions( {linksControl: false,panControl: false, zoomControl: false, mapTypeControl: false, streetViewControl: false, overviewMapControl: false, addressControl: false, enableCloseButton: false})

  var startPoint = new google.maps.LatLng(43.29638, 5.377674); 
  TRV.streetView.setPosition(startPoint)
  TRV.streetView.setPov({heading: 77.68007576992042, pitch: 0, zoom: 1})
}

TRV.getDists = function(){
    var pos = TRV.ASAP.getPosition();
    var loc = false;
    _(TRV.city).each(function(v,k){
        var loc_pos = new google.maps.LatLng(v.lat, v.lng) 
        var dist = google.maps.geometry.spherical.computeDistanceBetween(pos,loc_pos);
        if(dist < 10 && v.turned_on){
            loc = k;
        }
    })
    return loc;
}

TRV.message = function(m){
    $("#caption-small").html(m);
    $("#caption-small").css({left:0});
}

TRV.showArrive = function(l){
    var offscreen = -1 * $(window).width();
    $("#caption-small").css({left: offscreen});
    $("#caption").html("The A$AP Mob has arrived at " + l.full_name + ".")
    $("#caption").css({left:0});
}
TRV.hideArrive = function(l){
    var offscreen = -1 * $(window).width();
    $("#caption").css({left: offscreen});
    $("#caption-small").css({left: offscreen});
}

TRV.putAwayMap = function(p){
    var pos = TRV.ASAP.getPosition();
    TRV.streetView.setPosition(pos);
    $("#pano-caption").html(p.caption);

    TRV.current_place = p;

    TRV.hideArrive();
    setTimeout(function(){

        $("#rocky-mp3")[0].pause();
        $("#map-wrapper").addClass("flipped");
    },500)
}
TRV.getMapOn = function(){
  $("#map-wrapper").removeClass("flipped");
    setTimeout(function(){
        if(TRV.current_place){
            if(TRV.current_place.after_message){
                TRV.message(TRV.current_place.after_message);
                _(TRV.current_place.unlocks).each(function(u){
                  console.log("unlock",u)
                  TRV.drop_unlock(u);
                });
            }
            TRV.current_place = false;
        }
        $("#rocky-mp3")[0].play();
    },500)
}

TRV.drop_unlock = function(u){
   
  var location = TRV.city[u];
  if(!location.turned_on){

    var marker = {
      map: TRV.map,
      animation: google.maps.Animation.DROP,
      position: {lat: location.lat, lng: location.lng}
    };

    if(location.icon){
        marker.icon = location.icon
    }

    marker = new google.maps.Marker(marker)
  }
  location.turned_on = true;
}

$(function(){
    initialize();

  $("#rocky-mp3")[0].volume = 0;
  setTimeout(function(){
    $(window).scrollTop(0)
    $("#rocky-mp3")[0].pause();
    $("#rocky-mp3")[0].volume = 1;
    $("body").css({overflow: "visible"})
  },50)

  $("#title").height($(window).height())
  $("#page").height($(window).height() * 3);

  setInterval(function(){
    var image = {
      size: new google.maps.Size(280, 450),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(35, 105),
      scaledSize: new google.maps.Size(70, 112.5)
    }
    if(TRV.ASAP.sprite_down){
      image.url = "asap-sprite.png";
      TRV.ASAP.sprite_down = false;
    } else {
      image.url = "asap-sprite-down.png";
      TRV.ASAP.sprite_down = true;
    }
    TRV.ASAP.setIcon(image)
  },500)

    $(window).on("scroll",_.throttle(function(){
        if ($(window).scrollTop() > $(window).height()){
            $("#rocky-mp3")[0].play();
            $("body").css({overflow:"hidden"})
        }
    },25))

  $(document).on("keydown", function(e){
    var position = TRV.ASAP.getPosition(),
        on_it = false,
        key = false,
        multi = 4; 
        if(e.keyCode === 37){
            TRV.ASAP.setPosition({"lat":position.G + (.0000185 * multi), "lng": position.K - (.00003 * multi)})
            var on_it = TRV.getDists();
            var key = true;
        } else if (e.keyCode === 38){
            TRV.ASAP.setPosition({"lat":position.G + (.000028 * multi), "lng": position.K + (.00003 * multi)})
            var on_it = TRV.getDists();
            var key = true;
        } else if (e.keyCode === 39){
            TRV.ASAP.setPosition({"lat":position.G - (.0000185 * multi), "lng": position.K + (.00003 * multi)})
            var on_it = TRV.getDists();
            var key = true;
        } else if (e.keyCode === 40){
            TRV.ASAP.setPosition({"lat":position.G - (.000028 * multi), "lng": position.K - (.00003 * multi)})
            var on_it = TRV.getDists();
            var key = true;
        } else if (e.keyCode === 13) {
            var on_it = TRV.getDists();
            var key = true;
        }

        if(on_it && key){
          TRV.showArrive(TRV.city[on_it])

          if(e.keyCode === 13){
            TRV.putAwayMap(TRV.city[on_it]);
            TRV.map_off = true;
             
          }
        } else if (key) {
          TRV.hideArrive();
        }

       if(e.keyCode === 27){
            TRV.getMapOn();
        }
  })
})
