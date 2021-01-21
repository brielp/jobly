const { sqlForPartialUpdate } = require("../helpers/sql");

describe("partialUpdate", () => {
  test("generate columns to update SQL as well as values array within an object",
      function() {
    expect(sqlForPartialUpdate({username: "bob", firstName: "bob"}, {username: 'username', firstName: 'first_name'}))
    .toEqual({
        setCols: '"username"=$1, "first_name"=$2',
        values: ["bob", "bob"]})
    });
});