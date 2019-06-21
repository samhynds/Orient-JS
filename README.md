# Orient
Orient is a Javascript library for creating in-situ guided tours, help interfaces and onboarding flows for your web app. No dependencies needed.

[See a demo >>](https://projects.samhynds.com/orient-js/)

Orient has been tested in Chrome 75, Firefox 67, Internet Explorer 11, Edge 44, and Chrome Android 75.

## Quick Start
Orient can easily be integrated into a page:
1. Firstly, move the desired files from `/dist` into your project. The JS file is the main Orient script, and the CSS file is the theming.
2. Add the script tag in to the HTML of the page before the closing `</body>` tag referencing the orient file, wherever it has been placed, e.g. `<script src="/js/orient.min.js"></script>`.
3. Add the orient stylesheet tag into the `<head>` of the page `<link rel="stylesheet" type="text/css" href="/css/default.css">`.
4. Orient now needs a FlowFile to run, see [creating a FlowFile](#creating-a-flowfile). If you already know how to create a FlowFile, move it to a publically accessible directory and ensure that it can be requested via AJAX from wherever Orient will be running.
5. Finally, start the flow! A flow can be started automatically, or with an event (e.g. clicking a button). Read [starting a flow](#starting-a-flow) to see how.

## Terminology
**FlowFile:** A FlowFile is a JSON file with a particular syntax, which defines a Flow and its constituent slides. See [FlowFiles](#flowfiles) below to read more.

**Flow:** A flow is an ordered series of slides. The user can move either to the next or previous slide in a flow when they are interacting with Orient.

**Slide:** An individual element which helps describe something on your website or application. A slide is made up of a title, text and even media (images or video). A slide also has a style - which specifies how the slide is displayed on the page.


## FlowFiles
As [described above](#terminology), a Flow is a series of slides, and a FlowFile is a JSON file that defines a Flow and its constituent slides.

### Creating A FlowFile
FlowFiles are a key component of Orient and, at their core are a simple JSON file with an array of objects. Each object in the array represents a slide, and the index of each array item represents the order of the slides. From here, it's probably best to just show an example of a FlowFile:

```json
[
  {
    "title": "Welcome to Orient",
    "media": {
      "type": "image",
      "url": "media/slide1.jpg"
    },
    "body": "Orient is a JS library for easily creating in-situ guided tours, help systems and onboarding flows. You're currently seeing the first slide of an Orient Flow!",
    "style": "modal",
    "onShow": "console.log('Runs when the slide is shown')"
  },

  {
    "title": "Easy to Create Flows",
    "media": {
      "type": "video",
      "url": "media/slide2.mp4"
    },
    "body": "Define flows in simple external JSON files or even an API endpoint. Flows are made up of multiple slides, just like this one.",
    "style": "float",
    "target": "#main-title"
  },

  ...
]
```

This is actually the start of the FlowFile used in the `/examples` directory, so if you [view the demo](https://projects.samhynds.com/orient-js/), you can see exactly how it works. The full FlowFile is located at `/examples/flows/demo.json`.

As a minimum, each slide requires a `title`, `body` and `style` property. If the `style` is "float", then the `target` property is also required. See the [FlowFile Syntax Reference](#flowfile-syntax-reference) below for a full list of properties and their potential values.

If you've come here from the Quick Start and have created a FlowFile, the next step is [starting a flow](#starting-a-flow).

### FlowFile Syntax Reference
The FlowFile should be in JSON format and accessible by the client from the website via an AJAX request. The FlowFile should contain an array as the outermost element, and should contain objects immediately inside that array. You can always view the demo FlowFile which is located at `/examples/flows/demo.json`.

Each object represents a slide and can contain a variety of properties, which are detailed below.

- **title** (required) [string] - The title of the slide.
- **body** (required) [string] - The main body of text in the slide.
- **style** (required) [string] - Either "modal", "float", or "sidebar". The main styling of the slide is set depending on this value. If this value is "float", the object must also contain a "target" property.
- **target** [string] - A selector of an element on the page which the slide will be positioned next to, if the style is set to "float". Use standard CSS-style selectors, e.g. `#some_id` or `.this-class-right-here`. If the string does not start with a `#` or a `.` then it is assumed that the user is attempting to target an element by its `data-orient-target` attribute.
- **media** [object] - An object which contains information about the media (either an image or video) to display in the slide.
- **media.type** [string] - Either "video" or "image" depending on the type of media you want to display.
- **media.url** [string] - A relative or absolute URL containing the media you want to display. Must be accessible by an AJAX request.
- **media.autoplay** [boolean] - Defaults to true. Set to false if you don't want the video to autoplay.
- **media.muted** [boolean] - Defaults to true. Set to false if you don't want the video to be muted. Note: some browsers will only allow autoplaying if the video is muted.
- **media.controls** [boolean] - Defaults to false. Set to true if you want the user to see the video controls.
- **media.loop** [boolean] - Defaults to true. Set to false if you want the video to only play once.
- **onShow** [string] - A string which is injected into a `<script>` tag inside the slide HTML on the page and is run automatically when the slide is shown. WARNING: this allows HTML to be injected directly into the page.
- **onEnd** [string] - A string which is converted into a function using a `new Function` call inside its own anonymous self-executing function when a slide is removed from the page.
- **classList** [Array] - An array of strings which are added as classes to this slide. No need to prefix with "."

## Using Orient
Once Orient is correctly included the page and a FlowFile has been created, you can initialise Orient and start a flow.

Initialising Orient is simple. Just make sure that you call it after the Orient script tag, and after the page has loaded. Instantiation looks something like this:
```js
var orient = new Orient({
  flowURL: '/examples/flows/demo.json',
  keyEvents: true,
  clickOverlayClosesTour: true
});
```

The Orient constructor accepts a number of options which are documented in `src/orient.js`.

### Starting a Flow
Starting a flow looks like this (assuming you've used the variable name `orient`):
```js
orient.loadFlow(function () {
  orient.startFlow();
});
```

`orient.loadFlow()` makes the request to get the FlowFile, and accepts a callback function as an argument. Most commonly you will want to start the flow here with `orient.startFlow()`.

That's it! If you want to load and start the flow at another point, for example when a button is clicked, just move it into the event handler.

```js
var button = document.querySelector('#example-button');

button.addEventListener('click', function() {
  orient.loadFlow(function () {
    orient.startFlow();
  });
});
```

## Custom Styling
There are three ways to customise the styling of Orient. The first two are global style changes and will allow you to change the style of all of the common elements of Orient. If desired, you can also style individual slides - see the third option for this.

1. Copy `/src/default.css` into `/src` and modify it. [Run gulp](#modifying-orient) to build and minify it. Link to this CSS file in your page instead of `default.css`.
2. Pass the `cssPrefix` property to the Orient constructor. The wrapping `<div>` will contain this custom class which you can now target with new CSS rules in any stylesheet. See the `/examples/index.html` and `/examples/styles.css` files for an example.
3. You can specify custom classes for each slide in the FlowFile. This allows you to style the slides individually. Simply add a `classList` property to the slide in the FlowFile. The classList should be an array of strings, see the [FlowFile Syntax Reference](#flowfile-syntax-reference) for details or the last slide in the demo FlowFile `/examples/flows/demo.json` for an example.

## Modifying Orient
The main source files are in `/src`, modify these files and then run `gulp watch` to watch, minify and copy them into the `/dist` directory. To run gulp, you will need to run `npm install` from within the project folder.

Note: the minification/uglification step in the gulp build and watch tasks also remove any console.logs and other console.* functions. The non-minified versions of the files will retain these console.* function calls.

## Using Multiple Flows
If you want to use multiple flows on a page, you can either create a new Orient instance, as detailed in [Starting a Flow](#starting-a-flow) or you can re-use the same instance and simply change the flowURL. Ensure that any flows currently being run from that instance have been stopped - as running `loadFlow` will stop and reset that instance of Orient.
```js
orient.setFlowURL('/flows/new_flow_file.json');

orient.loadFlow(function () {
  orient.startFlow();
});
```

## License
MIT

## Known Issues
- Autoscrolling (scrolling to the active slide) only works on the y-axis.