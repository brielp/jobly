"use strict";

const db = require("../db.js");
const User = require("../models/user");
const Company = require("../models/company");
const { createToken } = require("../helpers/tokens");
const Job = require( "../models/jobs.js" );
const jobIds = [];

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM users");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM jobs");

  await Company.create(
      {
        handle: "c1",
        name: "C1",
        numEmployees: 1,
        description: "Desc1",
        logoUrl: "http://c1.img",
      });
  await Company.create(
      {
        handle: "c2",
        name: "C2",
        numEmployees: 2,
        description: "Desc2",
        logoUrl: "http://c2.img",
      });
  await Company.create(
      {
        handle: "c3",
        name: "C3",
        numEmployees: 3,
        description: "Desc3",
        logoUrl: "http://c3.img",
      });

  await User.register({
    username: "u1",
    firstName: "U1F",
    lastName: "U1L",
    email: "user1@user.com",
    password: "password1",
    isAdmin: true,
  });
  await User.register({
    username: "u2",
    firstName: "U2F",
    lastName: "U2L",
    email: "user2@user.com",
    password: "password2",
    isAdmin: false,
  });
  await User.register({
    username: "u3",
    firstName: "U3F",
    lastName: "U3L",
    email: "user3@user.com",
    password: "password3",
    isAdmin: false,
  });

  const j1 = await Job.create({
    company_handle: "c1",
    title: "j1",
    salary: 111,
    equity: "0.1",
  });
  const j2 = await Job.create({
    company_handle: "c2",
    title: "j2",
    salary: 222,
    equity: "0.2",
  });
  const j3 = await Job.create({
    company_handle: "c3",
    title: "j3",
    salary: 333,
    equity: "0.3",
  });

  jobIds.push(j1.id, j2.id, j3.id);


}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}


const u1Token = createToken({ username: "u1", isAdmin: true });
const u2Token = createToken({ username: "u2", isAdmin: false });


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
  jobIds
};
