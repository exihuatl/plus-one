const message = `
    Write a JSON object based on the data provided that conforms to the EXPECTED.

    To fill headquarters, companyUrl, email, phone fields search for them, but do not use real time data.
    If there are multiple values, select the first one.
    Retrieved location should be within the country.Country code is available in field "country".

    For benefits and industry - select from the list of possible values that suits best to the provided source.

    Answer only when you are sure that the data is correct.

    Translate everything to english.
  `;
