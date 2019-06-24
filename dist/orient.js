/*
  OrientJS - A library for creating in-situ guided tours, help systems
  and onboarding flows for your web-app with no dependencies.

  Github: https://github.com/samhynds/orient-js
*/

function Orient(options) {
  var self = this;

  /**
   * Constructor function, called at the end of the parent Orient function/class. Can be run with only a flowURL
   * option parameter. Run orient like this: new Orient(options)
   *
   * @param {Object} options The options object called on instantiation. Expects the flowURL property at a minimum, 
   * other properties are optional.
   * @param {string} options.flowURL The URL of the FlowFile to be loaded. Can be relative or absolute.
   * @param {boolean} options.autoScroll Should the page scroll to the active slide when the slide changes? Optional - 
   * defaults to true if not set.
   * @param {boolean} options.keyEvents Should the user be able to move to the next and previous slide using arrow
   * keys on the keyboard. Defaults to false.
   * @param {string} options.cssPrefix Prefix the slide wrapper element with a class for custom styling. Optional.
   * @param {Object} options.buttonHtml Custom HTML which will be inserted into the next, previous and exit buttons. 
   * Optional.
   * @param {string} options.buttonHtml.next HTML to be inserted into the next button. Will not be escaped. Optional.
   * @param {string} options.buttonHtml.prev HTML to be inserted into the prev button. Will not be escaped. Optional.
   * @param {string} options.buttonHtml.exit HTML to be inserted into the exit button. Will not be escaped. Optional.
   * @param {boolean} options.clickOverlayClosesTour Should clicking the overlay close the flow? Optional - defaults to 
   * false if not set.
   * @param {boolean} options.overlay Should there be an overlay over the page when the flow is active? Optional - 
   * defaults to true if not set.
   */
  this.init = function (options) {
    this.flowURL = options.flowURL;
    this.flowData = [];
    this.activeSlideIndex = 0;
    this.autoScroll = options.autoScroll === false ? false : true;
    this.cssPrefix = options.cssPrefix;
    this.buttonHtml = options.buttonHtml || {};
    this.clickOverlayClosesTour = options.clickOverlayClosesTour || false;
    this.overlay = options.overlay === false ? false : true;

    // Bind left, right, esc keys to events so that orient can be controlled with the keyboard - see handleKeyDown.
    if (options.keyEvents) {
      document.addEventListener("keydown", this.handleKeyDown);
    }

    // Bind slide reposition function to window resize event.
    window.addEventListener("resize", this.positionSlide)
  }

  /**
   * Loads the flow from the flowURL set on instantiation using this.httpGet. If successful,
   * data is stored in this.flowData.
   * @param {Function} afterLoad A callback function which is run after the flow is successfully loaded.
   */
  this.loadFlow = function (afterLoad) {
    this.httpGet(this.flowURL, function (response) { self.flowLoaded(response); afterLoad(); }, this.flowError);
  }

  /**
   * Sets the flowURL to the passed parameter and stops the current flow. Useful if you want to start a new flow
   * but don't want to create a new instance of Orient.
   * 
   * @param {string} newURL The URL of the FlowFile to be loaded. Can be relative or absolute.
   */
  this.setFlowURL = function (newURL) {
    this.stopFlow();
    this.flowURL = newURL;
  }

  /**
   * Moves to the next slide in the flow.
   * Note: This is run in the context of an event handler - so the keyword "this" refers
   * to the event. Use "self" if you need to reference Orient.
   */
  this.nextSlide = function () {
    // Remove current slide from the page
    document.body.removeChild(self.activeSlideEl);
    self.removeAttachedTargetStyles();

    // Run onEnd function for this slide if it's set (before activeSlideIndex is incremented)
    if (self.flowData[self.activeSlideIndex].onEnd) {
      (function () {
        var onEnd = new Function(self.flowData[self.activeSlideIndex].onEnd);
        onEnd();
      })();
    }

    self.activeSlideIndex++;

    if (self.activeSlideIndex > self.flowData.length - 1) {
      // We've reached the end of the flow
      self.activeSlideEl = null;
      self.stopFlow();
    } else {
      // Build and insert the next slide
      self.activeSlideEl = self.buildSlide();
      self.insertSlide();
    }
  }

  /**
   * Moves to the previous slide in the flow.
   * Note: This is run in the context of an event handler - so the keyword "this" refers
   * to the event. Use "self" if you need to reference Orient.
   */
  this.prevSlide = function () {
    // Run onEnd function for this slide if it's set (before activeSlideIndex is decremented)
    if (self.flowData[self.activeSlideIndex].onEnd) {
      var onEnd = new Function(self.flowData[self.activeSlideIndex].onEnd);
      onEnd();
    }

    if (self.activeSlideIndex > 0) {
      // Remove current slide from the page
      document.body.removeChild(self.activeSlideEl);

      self.removeAttachedTargetStyles();

      self.activeSlideIndex--;
      self.activeSlideEl = self.buildSlide();
      self.insertSlide();
    } else {
      console.log("[ORIENT] At start of flow - can't go any further back.");
    }
  }

  /**
   * Jumps to a specific slide in the flow.
   * Note: If this is run in the context of an event handler use "self" to reference Orient.
   * @param {number} slideNo The number of the slide to jump to, NOT zero-indexed - the first slide is 1.
   */
  this.jumpToSlide = function (slideNo) {
    if (slideNo < 1 || slideNo > self.flowData.length) {
      console.error("[ORIENT] Slide number must be between 1 and " + self.flowData.length + " inclusive.");
    } else {
      // Remove current slide from the page
      document.body.removeChild(self.activeSlideEl);

      self.activeSlideIndex = slideNo - 1;

      // Build and insert the next slide
      self.activeSlideEl = self.buildSlide();
      self.insertSlide();
    }
  }

  /**
   * Starts a flow from the beginning.
   */
  this.startFlow = function () {
    this.activeSlideIndex = 0;
    this.activeSlideEl = this.buildSlide();
    this.insertSlide();
  }

  /**
   * Stops a flow.
   */
  this.stopFlow = function () {
    if (self.activeSlideEl) {
      document.body.removeChild(self.activeSlideEl);
      self.removeAttachedTargetStyles();
    }
    self.activeSlideEl = self.activeSlideIndex = null;
    document.removeEventListener("keydown", self.handleKeyDown);
  }

  /**
   * Inserts the currently active slide into the page.
   */
  this.insertSlide = function () {
    document.body.appendChild(this.activeSlideEl);
  }

  /**
   * Creates an HTML slide element from a slide definition in the flowData. Adds bits to the
   * slide depending on the slide type.
   *
   * @returns {DOMElement} A complete JS DOM element with correct CSS class names, attributes
   * and innerHTML made up from the slide definition.
   */
  this.buildSlide = function () {
    var flowSlideData = this.flowData[this.activeSlideIndex];

    this.slideEl = this.createElement({
      type: 'div',
      className: 'animated fadeInDown orient-slide orient-slide--' + flowSlideData.style
    });

    // Add any custom class names which have been provided for this slide in the FlowFile.
    if (
      flowSlideData.extraClasses
      && Array.isArray(flowSlideData.extraClasses)
      && flowSlideData.extraClasses.length > 0
    ) {
      for (var i = 0; i < flowSlideData.extraClasses.length; i++) {
        this.slideEl.className += ' ' + flowSlideData.extraClasses[i];
      }
    }

    if (flowSlideData.style === "float") {
      this.attachTargetEl = null;
      this.positionSlide();
    }

    // Media (image or video)
    if (flowSlideData.media && typeof (flowSlideData.media) === 'object') {
      var slideMediaWrapperEl = this.createElement({
        type: 'div',
        className: 'orient-slide__media'
      });
      var slideMediaEl;

      if (flowSlideData.media.type === "video") {
        slideMediaEl = document.createElement('video');

        slideMediaEl.muted = (flowSlideData.media.muted === undefined) ? true : flowSlideData.media.muted;
        slideMediaEl.loop = (flowSlideData.media.loop === undefined) ? true : flowSlideData.media.loop;
        slideMediaEl.controls = (flowSlideData.media.controls === undefined) ? false : flowSlideData.media.controls;
        slideMediaEl.autoplay = (flowSlideData.media.autoplay === undefined) ? true : flowSlideData.media.autoplay;
      }
      else if (flowSlideData.media.type === "image") {
        slideMediaEl = document.createElement('img');
      }

      if (!slideMediaEl) {
        console.error("[ORIENT] Media type should be 'video' or 'image'");
      }

      if (flowSlideData.media.url) {
        slideMediaEl.src = flowSlideData.media.url;
      } else {
        console.error("[ORIENT] URL not specified for the media element on slide " + (this.activeSlideIndex + 1));
      }

      // Insert slide media element (image or video) into the wrapper element
      slideMediaWrapperEl.appendChild(slideMediaEl);

      // Insert the wrapper element into the slide element
      this.slideEl.appendChild(slideMediaWrapperEl);
    }

    var textWrapperEl = this.createElement({
      type: 'div',
      className: 'orient-slide__text-wrapper'
    });

    // Title
    textWrapperEl.appendChild(
      this.createElement({
        type: 'div',
        className: 'orient-slide__title',
        text: flowSlideData.title
      })
    );

    // Text
    textWrapperEl.appendChild(
      this.createElement({
        type: 'div',
        className: 'orient-slide__body',
        text: flowSlideData.body
      })
    );

    // Next, prev, close buttons - wrapped in a button wrapper element.
    var buttonWrapperEl = this.createElement({
      type: 'div',
      className: 'orient-slide__button-wrapper',
    });

    buttonWrapperEl.appendChild(
      this.createElement({
        type: 'div',
        className: 'orient-slide__button orient-slide__close-button',
        html: this.buttonHtml.exit || 'Exit',
        events: {
          click: orient.stopFlow
        }
      })
    );

    if (this.activeSlideIndex > 0) {
      buttonWrapperEl.appendChild(
        this.createElement({
          type: 'div',
          className: 'orient-slide__button orient-slide__prev-button',
          html: this.buttonHtml.prev || 'Prev',
          events: {
            click: orient.prevSlide
          }
        })
      );
    }

    if (this.activeSlideIndex < this.flowData.length - 1) {
      buttonWrapperEl.appendChild(
        this.createElement({
          type: 'div',
          className: 'orient-slide__button orient-slide__next-button',
          html: this.buttonHtml.next || 'Next',
          events: {
            click: orient.nextSlide
          }
        })
      );
    }

    var slideContentWrapperEl = this.createElement({
      type: 'div',
      className: 'orient-slide__content'
    });

    slideContentWrapperEl.appendChild(textWrapperEl);
    slideContentWrapperEl.appendChild(buttonWrapperEl);
    this.slideEl.appendChild(slideContentWrapperEl);

    if (flowSlideData.onShow) {
      this.slideEl.appendChild(
        this.createElement({
          type: 'script',
          html: flowSlideData.onShow
        })
      );
    }

    // Create a wrapper element for the slide and overlay (if modal).
    var slideWrapperEl = this.createElement({
      type: 'div',
      className: (self.cssPrefix ? self.cssPrefix : '') + ' orient-slide-wrapper'
    });


    // Also create and insert the overlay element.
    if (this.overlay) {
      slideWrapperEl.appendChild(
        this.createElement({
          type: 'div',
          className: 'orient-slide__overlay',
          events: {
            click: self.clickOverlayClosesTour ? orient.stopFlow : null
          }
        })
      );
    }

    slideWrapperEl.appendChild(this.slideEl);

    return slideWrapperEl;
  }

  /**
   * A wrapper for creating an HTML element using JS.
   * 
   * @param {Object} options An object used to create the HTML element.
   * @param {string} options.type The type of element to create - passed directly to document.createElement.
   * @param {string} options.className The CSS class name of the new element.
   * @param {text} options.text The text to insert inside the element. HTML is escaped.
   * @param {text} options.html The HTML to insert inside the element. HTML is NOT escaped.
   * @param {Object} options.events An object where each key should equal an event name (e.g. click or scroll). The 
   * value of this key (a function) is bound to the event named as the key on the new HTML element.
   * @param {Function} options.events.EVENT The function to run when <EVENT> is called from the listener on the new 
   * element.
   */
  this.createElement = function (options) {
    var newEl = document.createElement(options.type);

    if (options.className) {
      newEl.className = options.className;
    }

    if (options.text) {
      newEl.innerText = options.text;
    } else if (options.html) {
      newEl.innerHTML = options.html;
    }

    // If provided, loop over the events object and set and event listeners
    if (options.events && typeof options.events === "object") {
      for (var eventName in options.events) {
        newEl.addEventListener(eventName, options.events[eventName]);
      }
    }

    return newEl;
  }

  /**
   * Handles keydown events and maps them to next & prev slides and stop. This is set as a listener 
   * on the document if the user specifies keyEvents in the instantiation object for Orient.
   *
   * @param {Event} event A keydown event object
   */
  this.handleKeyDown = function (event) {
    switch (event.keyCode) {
      case 39: // Right arrow
        self.nextSlide();
        return;
      case 37: // Left arrow
        self.prevSlide();
        return;
      case 27: // Escape
        self.stopFlow();
        return;
      default:
        return;
    }
  }

  /**
   * A wrapper for an XMLHTTPRequest GET request.
   *
   * @param {string} url The URL to make a GET request to.
   * @param {Function} onLoad Callback function which is run after the request has loaded.
   * @param {Function} onError Callback function which is run if there is an error with the request.
   */
  this.httpGet = function (url, onLoad, onError) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', onLoad);
    xhr.addEventListener("error", onError);
    xhr.open('GET', url);
    xhr.send();
  }

  /**
   * Event handler for loading a flow. Called in loadFlow as the onLoad callback. Sets
   * this.flowData to the parsed JSON response.
   * 
   * @param {string} url The URL to make a GET request to.
   * @param {Function} onLoad Callback function which is run after the request has loaded.
   * @param {Function} onError Callback function which is run if there is an error with the request.
   */
  this.flowLoaded = function (response) {
    if (response.target.readyState === 4 && response.target.status === 200) {
      try {
        this.flowData = JSON.parse(response.target.responseText);
      } catch (e) {
        console.error("[ORIENT] There was a problem parsing the FlowFile.", e);
      }
    } else {
      console.error("[ORIENT] Couldn't load FlowFile. Please check the URL is correct: ", self.flowURL);
    }
  }

  /**
   * Event handler for errors requesting the flow file. 
   */
  this.flowError = function () {
    console.error("[ORIENT] There was a problem making a request to the FlowFile at", self.flowURL);
  }

  /**
   * Positions the slide next to its target element if the slide has the type "float".
   */
  this.positionSlide = function () {
    var flowSlideData = self.flowData[self.activeSlideIndex];
    var attachTarget = flowSlideData.target;

    if (!attachTarget) {
      return;
    }

    // User has specified a class or ID in the FlowFile
    if (attachTarget.substr(0, 1) === "#" || attachTarget.substr(0, 1) === ".") {
      self.attachTargetEl = document.querySelector(attachTarget);
    }

    // User has specified the data-orient-target attribute ID
    else {
      self.attachTargetEl = document.querySelector("[data-orient-target='" + attachTarget + "']"); // use data-orient-target attr
    }

    if (!self.attachTargetEl) {
      console.error("[ORIENT] Could not attach slide to element " + attachTarget);
      self.slideEl.style.top = "0px";
      self.slideEl.style.left = "0px";
    } else {
      // Style the element that the slide is attaching to, so it can be seen above the page overlay.
      self.attachTargetEl.classList.add('orient-target-el');

      // Position the slide next to the element it's attaching to.
      var boundingRect = self.getElAbsolutePosition(self.attachTargetEl);

      // Note: 360 is equal to the width of a floating slide, set in the CSS for .orient-slide--float
      // The floating slide would overflow the page width, so we need to right-align it.
      if (boundingRect.left + 360 > window.innerWidth) {
        self.slideEl.classList.add('orient-slide--aligned-right');
        self.slideEl.style.right = (window.innerWidth - boundingRect.right) + "px";
      } else {
        self.slideEl.style.left = boundingRect.left + "px";
      }

      self.slideEl.style.top = (boundingRect.top + boundingRect.height) + "px";

      if (self.autoScroll) {
        // Scroll the page so the element is visible
        // TODO: Scrolling on the X axis
        var scrollY = (boundingRect.top + boundingRect.height) - (window.innerHeight / 2);
        scrollY = (scrollY < 0) ? 0 : scrollY;
        window.scrollTo(0, scrollY);
      }
    }
  }

  /**
   * Removes any inline styles added to the attached elements.
   */
  this.removeAttachedTargetStyles = function () {
    if (this.attachTargetEl) {
      this.attachTargetEl.removeAttribute('style');
      self.attachTargetEl.classList.remove('orient-target-el');
    }
  }

  /**
   * Returns the absolute position and size of an element.
   * @param {DOMElement} el A DOM element - usually the result of a querySelector call.
   * @returns {Object} An object with the absolute position and size of the element. Has the properties left, top, 
   * right, bottom, height and width.
   */
  this.getElAbsolutePosition = function (el) {
    var rect = el.getBoundingClientRect();
    var scrollX;
    var scrollY;

    // IE compatibility for scrollX and scrollY
    if (window.scrollX && window.scrollY) {
      scrollX = window.scrollX;
      scrollY = window.scrollY;
    } else {
      scrollX = window.pageXOffset;
      scrollY = window.pageYOffset;
    }

    return {
      left: rect.left + scrollX,
      right: rect.right + scrollX,
      top: rect.top + scrollY,
      bottom: rect.bottom + scrollY,
      height: rect.height,
      width: rect.width
    };
  }

  // Initialise Orient!
  this.init(options);
}
