"use strict";

const db = require("../db");
const { NotFoundError, BadRequestError } = require( "../expressError" );
const { sqlForPartialUpdate } = require( "../helpers/sql" );

// Related functions for jobs 

class Job {
    // Create a job, update db, return new job data

    // Data: { id, title, salary, equity, company_handle }

    // Returns { id, title, salary, equity, company_handle }

    static async create({title, salary, equity, company_handle }) {

        const result = await db.query(
            `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [
                title,
                salary,
                equity,
                company_handle
            ]
        );
        const job = result.rows[0];
        
        return job;
    }

    static async findAll(queryString) {

        if(queryString) {
            const result = await Job.generateSQL(queryString);
            var sqlQuery = result.sqlQuery;
            var values = result.values;
        } else {
            var sqlQuery = `SELECT id,
                        title,
                        salary,
                        equity,
                        company_handle AS "companyHandle"
                    FROM jobs
                    ORDER BY title`;
            var values = [];
        }

        const result = await db.query(sqlQuery, values);
        return result.rows;
        
    }

    static async generateSQL(queryString) {

        let sqlQuery = `SELECT id,
                        title,
                        salary,
                        equity,
                        company_handle AS "companyHandle"
                    FROM jobs`
        let values = [];

        if (queryString.title && queryString.minSalary) {
            sqlQuery += ` WHERE title LIKE $1
                            AND salary >= $2`;
            values.push(`%${queryString.title}%`, queryString.minSalary);
        } else if (queryString.title && !queryString.minSalary) {
            sqlQuery += ` WHERE title LIKE $1`;
            values.push(`%${queryString.title}%`);
        } else if (!queryString.title && queryString.minSalary) {
            sqlQuery += ` WHERE salary >= $1`;
            values.push(queryString.minSalary);
        }

        if (queryString.hasEquity && !queryString.title && !queryString.minSalary) {
            sqlQuery += ` WHERE equity is not null`;
        } else if (queryString.hasEquity) {
            sqlQuery += ` AND equity is not null`;
        }

        sqlQuery += ` ORDER BY title`;

        return { sqlQuery, values };
    }


    static async get(id) {
        const jobRes = await db.query(
            `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`, [id]
        );

        const job = jobRes.rows[0];

        // console.log("JobRes: ", jobRes);

        if (!job) throw new NotFoundError('No job found with this id');
        return job;
    }

    static async update(id, data) {

        if (data.id || data.company_handle) throw new BadRequestError("Cannot update company_handle or job id");

        const { setCols, values } = sqlForPartialUpdate(data, {
            numEmployees: "num_employees",
            logoUrl: "logo_url"
        });

        const handleVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs
                          SET ${setCols}
                          WHERE id = ${handleVarIdx}
                          RETURNING id,
                                    title,
                                    salary,
                                    equity,
                                    company_handle AS "companyHandle"`;

        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError('No job found with this id');
        return job;
    }

    static async remove(id) {
        const result = await db.query(
            `DELETE FROM jobs
            WHERE id = $1
            RETURNING id`, [id]
        );
        const job = result.rows[0];

        if (!job) throw new NotFoundError('No job found with this id');
        return job;
    }
}


module.exports = Job; 