"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(queryString) {

    if (queryString) {
      const result = await Company.generateSQL(queryString);
      var sqlQuery = result.sqlQuery;
      var values = result.values;
    } else {
      var sqlQuery = `SELECT handle,
                      name,
                      description,
                      num_employees AS "numEmployees",
                      logo_url AS "logoUrl"
                  FROM companies
                  ORDER BY name`;
      var values = [];
    }
    
    // console.log("SQL query: ", sqlQuery);
    // console.log("Values: ", values);
    
    const companiesRes = await db.query(sqlQuery, values);
    return companiesRes.rows;
  }

  /** Filters companies based on query data.
   *
   * Returns object with SQL query and values. 
   * */

  static async generateSQL(queryString) {

    // Find max employees from the company data
    const maxEmployeeData = await db.query(`SELECT num_employees 
                                            FROM companies 
                                            WHERE num_employees is not null 
                                            ORDER BY num_employees DESC 
                                            LIMIT 1`);

    let minEmployees = queryString.minEmployees || 0;
    let maxEmployees = queryString.maxEmployees || maxEmployeeData.rows[0].num_employees;

    // Throw error if invalid input data 
    if (minEmployees > maxEmployees) {
      throw new BadRequestError("Min employees cannont be greater than Max employees");
    }
   
    let sqlQuery = `SELECT handle,
                      name,
                      description,
                      num_employees AS "numEmployees",
                      logo_url AS "logoUrl"
                  FROM companies`;
    let values = [];

    // Make query for each case of combination of query params
    if (queryString.name && !queryString.minEmployees && !queryString.maxEmployees) {
      sqlQuery += ` WHERE handle LIKE $1 OR name LIKE $1
                   ORDER BY name`
      values.push(`%${queryString.name}%`);
    } else if (queryString.name && maxEmployees && minEmployees >= 0) {
      sqlQuery += ` WHERE (handle LIKE $1 OR name LIKE $1)
                    AND num_employees BETWEEN $2 AND $3
                    ORDER BY name `;
      values.push(`%${queryString.name}%`, minEmployees, maxEmployees);
    } else if (!queryString.name && minEmployees >= 0 && maxEmployees) {
      sqlQuery += ` WHERE num_employees BETWEEN $1 AND $2
                    ORDER BY name`;
      values.push(minEmployees, maxEmployees)
    }
    
    return { sqlQuery, values };
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const jobRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity
          FROM jobs
          WHERE company_handle = $1`, [handle]
      );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    company.jobs = jobRes.rows;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
