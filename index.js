import axios from "axios";
import promisePoller from "promise-poller";
import _ from "lodash";
import {
  mockResponse,
  possibleBenefits,
  possibleIndustries,
} from "./constants.js";
import source from "./source.js";
import { API_KEY } from "./env.js";

const BASE_URL =
  "https://g6ygf5mh0i.execute-api.eu-west-1.amazonaws.com/development/api/v1/openai/";

(async function () {
  const headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const path = "chat-completion/submit";
  const keys = [
    "description",
    "title",
    "location",
    "url",
    "apply_url",
    "categories",
    "parameters",
  ];

  const message = `
    write a JSON based on the data provided.
  `;

  const messages = [
    {
      role: "system",
      content:
        "You return an output that conforms to the javascript method JSON.parse(OUTPUT). Keys should be in english, and values - in polish (do not translate the following: 'benefits', 'industries').",
    },
    {
      role: "user",
      content: `
        data source:
        ###
        ${JSON.stringify(source.data.map((x) => _.pick(x, keys)))}
        ###
      `,
    },
    {
      role: "user",
      content: `
        possible benefits source:
        ###
        ${JSON.stringify(possibleBenefits)}
        ###
      `,
    },
    {
      role: "user",
      content: `
        possible industries source:
        ###
        ${JSON.stringify(possibleIndustries)}
        ###
      `,
    },
    {
      role: "user",
      content: `
        output JSON example:
        ###
        ${JSON.stringify(mockResponse)}
        ###
      `,
    },
    {
      role: "user",
      content: message,
    },
  ];

  const data = {
    messages,
    temperature: 0,
    top_p: 1,
    n: 1,
  };

  try {
    const requestIdResponse = await axios({
      method: "POST",
      baseURL: BASE_URL,
      url: path,
      headers,
      data,
    });

    const result = await promisePoller.default({
      taskFn: () =>
        axios({
          method: "GET",
          baseURL: BASE_URL,
          url: "result/" + requestIdResponse.data.request_id,
          headers,
        }).then((response) => {
          console.log(new Date(), ":  ", response.data.status_code);

          if (response.data.finished) {
            return Promise.resolve(response.data);
          } else {
            return Promise.reject(response.data);
          }
        }),
      retries: 10,
      interval: 15000, // Poll every 5 seconds
    });

    console.log("@result", result.response);
  } catch (error) {
    console.error("@error", error);
  }
})();
