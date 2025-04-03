(function () {
  "use strict";

  var ListenerEventName;
  (function (ListenerEventName) {
    ListenerEventName["NETWORK_STATE_CHANGED"] = "NETWORK_STATE_CHANGED";
    ListenerEventName["INIT_WIDGET"] = "INIT_WIDGET";
    ListenerEventName["WIDGET_SUCCESSFULLY_INIT"] = "WIDGET_SUCCESSFULLY_INIT";
    ListenerEventName["CLOSE_WIDGET"] = "CLOSE_WIDGET";
    ListenerEventName["DESTROY_WIDGET"] = "DESTROY_WIDGET";
    ListenerEventName["WIDGET_SUCCESSFULLY_DESTROYED"] =
      "WIDGET_SUCCESSFULLY_DESTROYED";
    ListenerEventName["PAYMENT_INIT"] = "PAYMENT_INIT";
    ListenerEventName["PAYMENT_ABORTED"] = "PAYMENT_ABORTED";
    ListenerEventName["PENDING_PAYMENT"] = "PENDING_PAYMENT";
    ListenerEventName["ON_USER_FEEDBACK"] = "ON_USER_FEEDBACK";
    ListenerEventName["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    ListenerEventName["PAYMENT_SUCCESS"] = "PAYMENT_SUCCESS";
    ListenerEventName["PAYMENT_END"] = "PAYMENT_END";
    ListenerEventName["RETRY_PAYMENT"] = "RETRY_PAYMENT";
    ListenerEventName["WAVE_LINK"] = "WAVE_LINK";
  })(ListenerEventName || (ListenerEventName = {}));

  const mode = "dev";
  const _configs = {
    dev: {
      UI_APP_DEV: "https://widget-v3-staging.kkiapay.me",
      UI_APP_CDN_LINK: "./widget.js",
    },
    prod: {
      UI_APP_DEV: "https://widget-v3.kkiapay.me",
      UI_APP_CDN_LINK: "https://cdn.kkiapay.me/k.js",
    },
  };
  const custom_configs = {
    integration: {},
    poste_ci: { defaultCountry: "CI", theme: "#006951", poste: true },
    eservices: {
      paymentMethods: ["momo", "card"],
      serviceId: "INTEGRATION",
      theme: "#0A3764",
      e_services: true,
    },
  };
  const additionnal_configs = custom_configs.integration;
  const config = _configs[mode];

  const attributes = [
    "amount",
    "sandbox",
    "position",
    "theme",
    "paymentmethod",
    "paymentMethods",
    "providers",
    "fullname",
    "name",
    "email",
    "phoneNumber",
    "phone",
    "data",
    "key",
    "sdk",
    "url",
    "callback",
    "failed_callback",
    "successCallback",
    "buttontext",
    "direct",
    "split",
    "partnerid",
    "partnerId",
    "apikey",
    "api_key",
    "publicAPIKey",
    "countries",
  ];
  /**
   * Mapping attribute name from cdn to ui (widget)
   */
  const ATTRIBUTE_NAME = {
    phone: "phoneNumber",
    name: "fullname",
    paymentmethod: "paymentMethods",
    apikey: "key",
    successCallback: "callback",
    publicAPIKey: "key",
    api_key: "key",
    partnerid: "partnerId",
  };
  const ARRAY_ATTRIBUTE_NAME = ["countries", "paymentMethods"];
  function camelCase(value) {
    const values = value.split("-");
    return (
      values[0] +
      values
        .slice(1)
        .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
        .join("")
    );
  }
  function getTrueValue(attr) {
    const value = JSON.parse(JSON.stringify(attr));
    if (value === "") return value;
    if (Number.isNaN(Number(value))) {
      if (value === "false") return false;
      if (value === "true") return true;
      if (value.indexOf(",") > -1) {
        const values = value.split(" ").join("").split(",");
        return values;
      } else return value;
    }
    return Number(value);
  }
  function checkSameAttribut(configs_) {
    const configs = { ...configs_ };
    for (let i in ATTRIBUTE_NAME) {
      if (configs[i]) {
        configs[ATTRIBUTE_NAME[i]] = configs[i];
        delete configs[i];
      }
    }
    for (let i in configs) {
      // values of these keys are already stringified to be passed in html
      if (["data", "paymentMethods", "countries"].includes(i)) {
        try {
          configs[i] = JSON.parse(JSON.stringify(configs[i]));
        } catch (err) {}
        if (ARRAY_ATTRIBUTE_NAME.includes(i)) {
          configs[i] = !Array.isArray(getTrueValue(configs[i]))
            ? [getTrueValue(configs[i])]
            : getTrueValue(configs[i]);
          if (i === "paymentMethods") {
            const paymentMethods = configs["paymentMethods"];
            paymentMethods.find(
              (val) => !["momo", "card", "direct_debit"].includes(val)
            )
              ? (configs["paymentMethods"] = ["momo", "card", "direct_debit"])
              : "";
          }
        }
      }
      if (i === "amount") configs[i] = Number(configs[i]);
      if (i === "phoneNumber") configs[i] = String(configs[i]);
      if (i === "sandbox" && !(typeof configs["sandbox"] === "boolean")) {
        if (configs["sandbox"] === "true") configs["sandbox"] = true;
        else if (configs["sandbox"] === "false") configs["sandbox"] = false;
        else configs["sandbox"] = false;
      }
      if (
        i === "position" &&
        !["left", "right", "center"].includes(configs[i])
      ) {
        configs[i] = "center";
      }
    }
    return configs;
  }

  class KKiapayWidget extends HTMLElement {
    constructor() {
      super();
      const dom = this.attachShadow({ mode: "open" });
      let btn = document.createElement("button");
      let data;
      btn.innerHTML =
        window.navigator.language.split("-")[0] === "en"
          ? "Pay now"
          : "Payer maintenant";
      btn.setAttribute(
        "style",
        `
          background-color: #4661b9;
          color: white;
          padding: 10px 20px;
          font-size: 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        `
      );
      dom.appendChild(btn);
      setTimeout(() => {
        data = Object.freeze({ ...this });
      }, 100);
      btn.addEventListener("click", () => {
        // console.log("[data-web-component]", data);
        window.openKkiapayWidget(data);
      });
    }
    static get observedAttributes() {
      return attributes;
    }
    attributeChangedCallback(property, oldValue, newValue) {
      if (oldValue !== null) return;
      const ref = this;
      ref[camelCase(property)] = newValue;
      if (!this.shadowRoot) return;
      const btn = this.shadowRoot.querySelector("button");
      if (!btn) return;
      if (property === camelCase("buttontext") && newValue) {
        btn.innerHTML = newValue;
      }
      if (property === "class" && newValue) btn.setAttribute("class", newValue);
    }
  }

  let kkiapayIframe;
  let initFn = () => undefined;
  const generateIframe = () => {
    const zindex = new Date().getTime();
    kkiapayIframe = document.createElement("iframe");
    kkiapayIframe.style.cssText = `
      display: block;
      height: 100svh; 
      width: 100%; 
      position: fixed;
      top: 0;
      left: 0;
      z-index: ${zindex};`;
    kkiapayIframe.src = config.UI_APP_DEV;
    kkiapayIframe.setAttribute("frameborder", "0");
    kkiapayIframe.addEventListener("load", () => initFn());
  };
  const widgetByClassName = () => {
    const kkiapayButton = document.querySelector(".kkiapay-button");
    const src = document.querySelector(
      `script[src="${config.UI_APP_CDN_LINK}"]`
    );
    if (src && kkiapayButton) {
      let widgetData = {};
      for (let i of attributes) {
        const attr = src.getAttribute(i);
        if (attr) widgetData[i] = attr;
      }
      kkiapayButton.addEventListener("click", () => {
        openKkiapayWidget(widgetData);
      });
    }
  };
  const init = (configs) => {
    configs = checkSameAttribut(configs);
    const iframe = kkiapayIframe.contentWindow;
    if (iframe)
      iframe.postMessage(
        {
          name: ListenerEventName.INIT_WIDGET,
          data: {
            ...configs,
            host: window.location.href,
            ...additionnal_configs,
          },
        },
        config.UI_APP_DEV
      );
  };
  generateIframe();
  const openKkiapayWidget = (configs) => {
    initFn = () => init(configs);
    document.body.appendChild(kkiapayIframe);
  };
  const closeKkiapayWidget = () => kkiapayIframe.remove();
  const focusWaveLink = (data) => window.open(data, "_blank")?.focus();
  const events = (() => {
    const result = {
      [ListenerEventName.CLOSE_WIDGET]: closeKkiapayWidget,
      [ListenerEventName.WAVE_LINK]: focusWaveLink,
    };
    for (const event in ListenerEventName) {
      if (!result[event]) {
        result[event] = () => undefined;
      }
    }
    return result;
  })();
  window.addEventListener("load", () => widgetByClassName());
  window.addEventListener("message", (event) => {
    if (event.data && events[event.data.name]) {
      events[event.data.name](event.data.data);
    }
  });
  const addWidgetInitListener = (cb) => {
    events.INIT_WIDGET = cb;
  };
  const addKkiapayCloseListener = (cb) => {
    events.CLOSE_WIDGET = () => {
      closeKkiapayWidget();
      cb();
    };
  };
  const addWidgetDestroyedListener = (cb) => {
    events.DESTROY_WIDGET = cb;
  };
  const addPaymentInitListener = (cb) => {
    events.PAYMENT_INIT = cb;
  };
  const addPaymentAbortedListener = (cb) => {
    events.PAYMENT_ABORTED = cb;
  };
  const addPendingListener = (cb) => {
    events.PENDING_PAYMENT = cb;
  };
  const addFeedbackListener = (cb) => {
    events.ON_USER_FEEDBACK = cb;
  };
  const addSuccessListener = (cb) => {
    events.PAYMENT_SUCCESS = cb;
  };
  const addFailedListener = (cb) => {
    events.PAYMENT_FAILED = cb;
  };
  const addPaymentEndListener = (cb) => {
    events.PAYMENT_END = cb;
  };
  const onNetworkStateChanged = (cb) => {
    events.NETWORK_STATE_CHANGED = cb;
  };
  const addKkiapayListener = (event, cb) => {
    events[`PAYMENT_${event.toUpperCase()}`] = cb;
  };
  const removeKkiapayListener = (event) => {
    events[`PAYMENT_${event.toUpperCase()}`] = () => {};
  };
  window.openKkiapayWidget = openKkiapayWidget;
  window.closeKkiapayWidget = closeKkiapayWidget;
  window.addWidgetInitListener = addWidgetInitListener;
  window.addKkiapayCloseListener = addKkiapayCloseListener;
  window.addWidgetDestroyedListener = addWidgetDestroyedListener;
  window.addPaymentInitListener = addPaymentInitListener;
  window.addPaymentEndListener = addPaymentEndListener;
  window.addPaymentAbortedListener = addPaymentAbortedListener;
  window.addFeedbackListener = addFeedbackListener;
  window.addPendingListener = addPendingListener;
  window.addFailedListener = addFailedListener;
  window.addSuccessListener = addSuccessListener;
  window.onNetworkStateChanged = onNetworkStateChanged;
  window.addEventListener = addEventListener;
  window.addKkiapayListener = addKkiapayListener;
  window.removeKkiapayListener = removeKkiapayListener;
  // Enregistrement du web component
  if (!window.customElements.get("kkiapay-widget"))
    window.customElements.define("kkiapay-widget", KKiapayWidget);
})();
