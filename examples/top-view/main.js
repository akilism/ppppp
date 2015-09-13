var React = require('react');
var $ = require('jquery');
var _ = require('underscore');

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
        full_name: "Trilby's Bar"
    },
    "park": {
        lat: 40.72061576057116,
        lng: -73.95473599433899,
        full_name: "City Park IV"
    },
    "club": {
        lat: 40.71924154297441,
        lng: -73.9540708065033,
        full_name: "The Bounce Club"
    },
    "resto": {
        lat: 40.72007908725286,
        lng: -73.95987510681152,
        full_name: "Spicee's Meatball"
    },
  }

  _.each(TRV.city,function(v,k){
    var marker = new google.maps.Marker({
      position: {lat: v.lat, lng: v.lng},
      map: TRV.map
      })
    })

  map.addListener('click', function(e) {
    console.log(e.latLng)
  })
}

TRV.getDists = function(){
    var pos = TRV.ASAP.getPosition();
    var loc = false;
    _(TRV.city).each(function(v,k){
        var loc_pos = new google.maps.LatLng(v.lat, v.lng) 
        var dist = google.maps.geometry.spherical.computeDistanceBetween(pos,loc_pos);
        if(dist < 10){
            loc = k;
        }
    })
    return loc;
}

$(function(){
    initialize();

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
            $("body").css({overflow:"hidden"})
        }
    },25))

  $(document).on("keydown", function(e){
    var position = TRV.ASAP.getPosition(),
        on_it = false,
        multi = 4; 
        if(e.keyCode === 37){
            TRV.ASAP.setPosition({"lat":position.G + (.0000185 * multi), "lng": position.K - (.00003 * multi)})
            var on_it = TRV.getDists();
        } else if (e.keyCode === 38){
            TRV.ASAP.setPosition({"lat":position.G + (.000028 * multi), "lng": position.K + (.00003 * multi)})
            var on_it = TRV.getDists();
        } else if (e.keyCode === 39){
            TRV.ASAP.setPosition({"lat":position.G - (.0000185 * multi), "lng": position.K + (.00003 * multi)})
            var on_it = TRV.getDists();
        } else if (e.keyCode === 40){
            TRV.ASAP.setPosition({"lat":position.G - (.000028 * multi), "lng": position.K - (.00003 * multi)})
            var on_it = TRV.getDists();
        }

        if(on_it){
          TRV.showArrive(TRV.city[on_it])
        }
  })
})
