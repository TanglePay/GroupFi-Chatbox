import svg from './trollbox.svg';

const onLoad = () => {
  // var iframe = document.createElement("iframe");
  var image = document.createElement('img');
  image.src = svg;

  var style = image.style;
  style.position = 'fixed';
  style.right = '80px';
  style.bottom = '80px';
  style.cursor = 'pointer';

  // iframe.src = "https://test.trollbox.iotacat.com/"

  document.body.append(image);
};

window.addEventListener('load', onLoad);
