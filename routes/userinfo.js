import express from 'express';
import UserinfoTable from '../models/userinfoTable.js';
import { Sequelize } from 'sequelize';
import sequelize from '../models/sequelizeConfig.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import hbs from 'nodemailer-express-handlebars';
import nodemailer from 'nodemailer';
import path from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// sequelize.sync();

async function hashPassword(plaintextPassword) {
  const hash = await bcrypt.hash(plaintextPassword, 10);
  return hash;
}

async function comparePassword(plaintextPassword, hash) {
  // const result = await bcrypt.compare(plaintextPassword, hash);
  const result = plaintextPassword === hash;
  return result;
}

router.get('/all', async (req, res) => {
  try {
    const result = await UserinfoTable.findAll({
      order: [['id', 'ASC']],
    });
    res.send(result);
  } catch (err) {
    console.log('Error fetching : ', err);
  }
});

router.post('/register', async (req, res) => {
  const { username, emailid, password } = req.body;

  // const hashed_password = await hashPassword(password);

  try {
    // Find the user by username
    const user = await UserinfoTable.findOne({
      where: {
        username: username,
      },
    });

    if (user) {
      res.status(409).send({ error: 'Username already exists' });
    } else {
      try {
        const user = await UserinfoTable.create({
          username: username,
          emailid: emailid,
          password: password,
        });
        // console.log("userr ", user);

        if (user) {
          let token = jwt.sign({ id: user.id }, process.env.SECRETKEY, {
            expiresIn: 1 * 24 * 60 * 60 * 1000,
          });

          res.cookie('jwt', token, {
            maxAge: 1 * 24 * 60 * 60,
            httpOnly: true,
          });
          console.log('user', JSON.stringify(user, null, 2));
          console.log(token);
          //send users details
          return res.status(201).send(user);
        } else {
          return res.status(409).send('Details are not correct');
        }
      } catch (error) {
        res.send(error);
      }
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post('/login', async (req, res) => {
  
  const { username, emailid, password } = req.body;

  try {
    // Find the user by username
    const user = await UserinfoTable.findOne({
      where: {
        emailid: emailid,
      },
    });

    if (user) {
      // console.log(password, user.password);
      const isauthentic = await comparePassword(password, user.password);

      if (isauthentic) {
        let token = jwt.sign({ id: user.id }, process.env.SECRETKEY, {
          expiresIn: 1 * 24 * 60 * 60 * 1000,
        });

        res.cookie('jwt', token, { maxAge: 1 * 24 * 60 * 60, httpOnly: true });
        console.log('user', JSON.stringify(user, null, 2));
        console.log(token);
        // return res.status(201).send(user);
        res.send('Success');
      } else {
        return res.status(401).send('Authentication failed');
      }
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

router.post('/forgotPassword', async (req, res) => {
  const { username, emailid } = req.body;
  let password = '';
  const curYear = new Date().getFullYear();

  try {
    const user = await UserinfoTable.findOne({
      where: {
        emailid: emailid,
      },
    });
    if (user) {
      password = user.password;
    } else {
      res.send('Invalid Email id');
    }
  } catch (error) {
    console.error('Error finding password:', error.message);
  }

  if (password != '') {
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAILID,
        pass: process.env.APPPASSWORD,
      },
    });

    // point to the template folder
    const handlebarOptions = {
      viewEngine: {
        partialsDir: path.resolve('./views/'),
        defaultLayout: false,
      },
      viewPath: path.resolve('./views/'),
    };

    // use a template file with nodemailer
    transporter.use('compile', hbs(handlebarOptions));

    const context = {
      name: emailid,
      password: password,
      year: curYear,
    };

    var mailOptions = {
      from: process.env.EMAILID,
      to: emailid,
      subject: 'Forgot password',
      text: '',
      template: 'forgot',
      context: context,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        res.send(error);
      } else {
        console.log('Email sent: ' + info.response);
        res.send(info.response);
      }
    });
  }
});

// router.get('/chat/:query', async (req, res) => {
//   try {
//     const python = spawn('python', ['routes/main.py', req.params.query]);

//     python.stdout.on('data', (data) => {
//       const output = data.toString();
//       console.log('result  : ', output);
//       res.send(output);
//     });

//     python.on('close', (code) => {
//       console.log(`closed with code : ${code}`);
//     });
//   } catch (err) {
//     console.log('Error fetching : ', err);
//     res.status(500).send('Internal Server Error');
//   }
// });

export default router;
