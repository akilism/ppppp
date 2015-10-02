var React = require("react")
var $ = require("jquery")
var _ = require("underscore")
var Component = React.Component

const Tween = {
  linear(t, b, c, d) {
    return c*t/d+b;
  },
  easeOutExpo(t, b, c, d) {
    return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
  },
  easeInOutQuad(t, b, c, d) {
    t /= d/2;
    if (t < 1) return c/2*t*t + b;
    t--;
    return -c/2 * (t*(t-2) - 1) + b;
  },
  easeInOutExpo(t, b, c, d) {
    t /= d/2;
    if (t < 1) return c/2 * Math.pow( 2, 10 * (t - 1) ) + b;
    t--;
    return c/2 * ( -Math.pow( 2, -10 * t) + 2 ) + b;
  },
};

function rotate(arr, i) {
  i = i % arr.length;
  var left = arr.slice(0, i);
  var right = arr.slice(i, arr.length);
  return right.concat(left);
}

class Flipbook extends Component {

  render() {
    const {scrollTop, scrollHeight, urls, minOpacity, maxOpacity, fadeInFn, fadeOutFn, step} = this.props;
    if (urls.length) {
      //const current = Math.floor(Tween.linear(scrollTop, 0, urls.length, scrollHeight));
      const current = Math.floor(scrollTop/step) % urls.length
      const frameDistance = scrollHeight / urls.length;
      const frameTop = scrollTop % frameDistance;
      var images = urls.map((url, i) => {
        var opacity;
        if (i === current) {
          opacity = fadeOutFn(frameTop, maxOpacity, minOpacity - maxOpacity, frameDistance);
        } else if (i === (current + 1) % urls.length) {
          opacity = fadeInFn(frameTop, minOpacity, maxOpacity - minOpacity, frameDistance);
        } else {
          opacity = minOpacity;
        }
        const style = {
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: opacity,
          width: this.props.imageWidth
        };
        return (
          <img key={url} src={url} style={style} />
        );
      });
      images = rotate(images, current).reverse();
      return (
        <div {...this.props}>
          {images}
        </div>
      );
    } else {
      return null;
    }
  }
}

Flipbook.defaultProps = {
    scrollTop: 0,
    scrollHeight: 0,
    minOpacity: 0,
    maxOpacity: 1,
    fadeInFn: Tween.linear,
    fadeOutFn: Tween.linear,
}

class PFlipbook extends Component {
    
  componentDidMount(){
    var width = this.props.width || $(window).width(),
        height = this.props.height || $(window).height(),
        el_id = this.props.id,
        renderer = new PIXI.autoDetectRenderer(width, height, {transparent: true, antialias: true}),
        stage = new PIXI.Container(),
        frames = _.range(0, this.props.frames),
        base_name = this.props.baseName,
        loader = PIXI.loader,
        movie, ar, new_height;

      document.getElementById(el_id).appendChild(renderer.view);
      frames = _.map(frames,function(i){
          var name = "frame_"+i+".jpg"
          var url = base_name + "/" + name;
          var tex = PIXI.Texture.fromImage(url);
          loader.add(name, url)
          return tex;
      })

      loader.load(function(l,r){
        movie = new PIXI.extras.MovieClip(frames);
        ar = frames[0].width / frames[0].height;
        new_height = width / ar;
        movie.gotoAndStop(0)
        stage.addChild(movie);
        requestAnimationFrame( animate );
      });

      var that = this;
      
      function animate() {
              requestAnimationFrame( animate );
              movie.width = $(window).width();
              movie.height = ($(window).width() / ar);
              movie.gotoAndStop(that.props.frame);
              renderer.render(stage);
          }
  }

  render() {
      return (
        <div {...this.props}>
          {this.props.children}
        </div>
      );
  }
}
Flipbook.P = PFlipbook

module.exports = Flipbook
