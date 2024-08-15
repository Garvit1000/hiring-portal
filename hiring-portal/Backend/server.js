const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const { exec } = require('child_process')
const bodyParser = require('body-parser');
const Job = require('./models/Job');
const User = require('./models/User'); 
const Company = require('./models/Company');
const Assessment = require('./models/Assesment')
const Application = require('./models/Application');
const compilex = require('compilex');


const http = require('http');
const socketIo = require('socket.io');
const Assesment = require('./models/Assesment');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.post('/api/users/signup', async (req, res) => {
  try {
    const { name, email, password, location, locationPreferences, expectedSalary,resume, jobType, jobTitle, techStack, skills, address, degree, university, cgpa, pastJobs, pastJobDetails } = req.body;

    console.log("Received data", req.body);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      profileDetails: {
        education: { degree, university, cgpa },
        experience: pastJobs,
        skills,
        address,
        techStack
      },
      location,
      locationPreferences,
      expectedSalary,
      jobType,
      jobTitle,
      resume
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user', error });
  }
});

app.post('/api/users/signin', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    const user = await User.findOne({ email });
    console.log(user);
    if (!user) {
      console.warn(`Sign in failed: invalid email - ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`Sign in failed: incorrect password - ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '1d' }
    );
    
    res.json({ token, email: user.email });
  } catch (error) {
    console.error('Error during sign in:', error);
    res.status(500).json({ message: 'Error during sign in', error });
  }
});


app.post('/api/jobs', async (req, res) => {
  console.log('Request Body:', req.body); 
  try {
      const {
          title,
          description,
          requirements,
          type,
          salaryRange,
          workLocation,
          role,
          department,
          employmentType,
          remote,
          companyCulture,
          applicationDeadline,
          industry,
          keywords,
          contactEmail,
          companyWebsite,
          jobResponsibilities,
          languagesRequired,
          ownerEmail 
      } = req.body;

      if (!ownerEmail) {
          return res.status(400).json({ error: 'Owner email is required' });
      }

      const company = await Company.findOne({ owner: ownerEmail });
      if (!company) {
          return res.status(404).json({ error: 'Company not found for the given owner email' });
      }

      const job = new Job({
          title,
          description,
          requirements,
          postedBy: company._id,
          type,
          salaryRange: {
              min: salaryRange.min,
              max: salaryRange.max
          },
          workLocation,
          role,
          department,
          employmentType,
          remote,
          companyCulture,
          applicationDeadline: new Date(applicationDeadline), 
          industry,
          keywords,
          contactEmail,
          companyWebsite,
          jobResponsibilities,
          languagesRequired
      });

      await job.save();
      console.log('data saved')
      res.status(201).send(job);
  } catch (error) {
      res.status(400).send({ error: error.message });
  } 
});
app.get('/api/job',async (req,res)=>{
 try{ const jobs= await Job.find();
  
  res.status(200).json(jobs);
} catch (error) {
    res.status(400).json({ error: error.message });
}
})
app.get('/api/jobs', async (req, res) => {
  try {
      const email = req.query.email; 
      console.log(email,"i fonud it")
      if (!email) {
          return res.status(400).json({ error: 'Email is required' });
      }
      
      const user = await User.findOne({ email:email });
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      const comobj = await Company.find({ owner:email });
      const jobs= await Job.find({ postedBy:comobj });
      res.status(200).json(jobs);
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});
app.get('/api/jobs/:id', async (req, res) => {
  try {
    console.log("job called")
    console.log(req)
      const job = await Job.findById(req.params.id);
      console.log(job)
      if (!job) {
          return res.status(404).json({ error: 'Job not found' });
      }
      res.status(200).json(job);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});
app.get('/api/companies/:id', async (req, res) => {
  try {
      const company = await Company.findById(req.params.id);
      if (!company) {
          return res.status(404).json({ error: 'Company not found' });
      }
      res.json(company);
  } catch (error) {
      console.error('Error fetching company:', error);
      res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/jobs/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const updateData = req.body;

    const updatedJob = await Job.findByIdAndUpdate(jobId, updateData, { new: true });

    if (!updatedJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/users/profile', async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile', error });
  }
});

app.post('/api/company', async (req, res) => {
  try {
    console.log("Received request body:", req.body);

    const {
      name,
      description,
      industry,
      location,
      website,
      email,
      phone,
      establishedYear,
      employeesCount,
      linkedin,
      facebook,
      twitter,
      ownerEmail,
      logo
    } = req.body;

    if (!ownerEmail) {
      return res.status(400).json({ error: 'Owner email is required' });
    }

    const user = await User.findOneAndUpdate(
      { email: ownerEmail },
      { role: 'owner' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newCompany = new Company({
      name,
      description,
      industry,
      location,
      website,
      email,
      phone,
      logo,
      establishedYear,
      employeesCount,
      socialMediaLinks: {
        linkedin,
        facebook,
        twitter
      },
      owner: ownerEmail 
    });

    const result = await newCompany.save();
    console.log('Company saved:', result);

    res.status(201).json({ message: 'Company registered successfully', company: result });

  } catch (error) {
    console.error('Error saving company:', error);
    res.status(500).json({ message: 'Error registering company', error });
  }
});
app.post('/api/test', async (req, res) => {
  try {
    
    const { jobId, maxMarks, questions, owner,endTime,startTime } = req.body;
    console.log(owner)
    const company = await Company.findOne({ owner: owner });
    console.log(company)
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    console.log(jobId,maxMarks,questions,owner)

    const newAssessment = new Assessment({
      jobId:jobId,
      createdBy: company._id, 
      maxMarks,
      questions,
      startTime,
      endTime
    });

    const savedAssessment = await newAssessment.save();
    console.log("assesment saved")
    res.status(201).json(savedAssessment);
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ message: 'Failed to create assessment', error });
  }
});
const nodemailer = require('nodemailer');

app.post('/api/applications', async (req, res) => {
  console.log("Got request");

  try {
    const {
      resume,
      cv,
      mobileNumber,
      email,
      firstName,
      lastName,
      gender,
      instituteName,
      course,
      graduatingYear,
      courseDuration,
      countryOfResidence,
      education,
      experience,
      skills,
      jobId,
      emailcurrent,
    } = req.body;

    if (!resume || !mobileNumber || !email || !firstName || !gender || !instituteName || !course || !graduatingYear || !courseDuration || !countryOfResidence) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    console.log(emailcurrent);
    const applicant = await User.findOne({ email: emailcurrent });

    if (!applicant) {
      return res.status(404).json({ message: "Applicant not found." });
    }

    const applicantId = applicant._id;

    const newApplication = new Application({
      resume,
      cv,
      mobileNumber,
      email,
      firstName,
      lastName,
      gender,
      instituteName,
      course,
       graduatingYear,
      courseDuration,
      countryOfResidence,
      education,
      experience,
      skills,
      jobId,
      applicantId,
    });

    const savedApplication = await newApplication.save();

    // Setup email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',  // Updated to use 'gmail' service instead of 'host'
      auth: {
        user: 'gabaniyash846@gmail.com',
        pass: 'frtkmvbebchjfile',
      },
    });

    const job = await Job.findById(jobId);
    const jobTitle = job.title;

    const mailOptions = {
      from: 'gabaniyash846@gmail.com',
      to: emailcurrent,
      subject: 'Job Application Confirmation',
      text: `Dear ${firstName} ${lastName},\n\nYour application for the job "${jobTitle}" has been successfully submitted.\n\nThank you for applying!\n\nBest regards,\nYour Company Name`,
    };

    // Send email and handle response accordingly
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        // Even though email fails, the application is already saved, so you might want to notify the client but still return success for the application submission
        return res.status(201).json({
          message: "Application submitted successfully, but failed to send confirmation email.",
          application: savedApplication,
          emailError: error.message,
        });
      } else {
        console.log('Email sent: ' + info.response);
        return res.status(201).json({
          message: "Application submitted successfully and confirmation email sent.",
          application: savedApplication,
        });
      }
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    return res.status(500).json({ message: "Failed to submit application.", error });
  }
});

app.get('/api/applications/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
      const applications = await Application.find({ jobId }).populate('applicantId', 'name email profileDetails');

      if (!applications || applications.length === 0) {
          return res.status(404).json({ message: 'No applications found for this job' });
      }

      res.json(applications);
  } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/assessments/:jobId',async (req,res)=>{
  const { jobId } = req.params;
  try {
    const assessments = await Assessment.find({ jobId });

    if (assessments.length === 0) {
        return res.status(404).json({ message: 'No assessments found for this job' });
    }

    res.status(200).json(assessments);
} catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
}

})
app.get('/api/assessmen/:id', async (req, res) => {
  try {
      const assessment = await Assessment.findById(req.params.id);
      console.log(assessment)
      if (!assessment) {
          return res.status(404).json({ message: 'Assessment not found' });
      }
      res.json(assessment);
  } catch (error) {
      res.status(500).json({ message: 'Server Error' });
  }
});
app.use(bodyParser.json());
const options = { stats: true }; 
compilex.init(options);

app.post('/compile', function(req, res) {
    const { language, code, testcases } = req.body;
    let envData = { OS: "windows", options: { timeout: 10000 } };
    let results = [];
    let failed = false; 

    const executeTestCase = (index) => {
        if (index >= testcases.length) {
            res.json(results.slice(0, 2));
            return;
        }

        const { input, output } = testcases[index];
        let compileFunc;

        switch (language) {
            case "cpp":
                envData.cmd = "g++";
                compileFunc = compilex.compileCPPWithInput;
                break;
            case "java":
                compileFunc = compilex.compileJavaWithInput;
                break;
            case "python":
                compileFunc = compilex.compilePythonWithInput;
                break;
            default:
                res.json({ error: "Language not supported" });
                return;
        }

        compileFunc(envData, code, input, (data) => {
            if (data.error) {
                results.push({
                    input,
                    expectedOutput: output,
                    output: data.error,
                    passed: false,
                    index
                });
                failed = true; 
                res.json({
                    input,
                    expectedOutput: output,
                    output: data.error,
                    passed: false,
                    index
                });
                return; 
            } else {
                const passed = data.output.trim() === output.trim();
                results.push({
                    input,
                    expectedOutput: output,
                    output: data.output,
                    passed,
                    index
                });

                if (!passed) {
                    failed = true; 
                    res.json({
                        input,
                        expectedOutput: output,
                        output: data.output,
                        passed: false,
                        index
                    });
                    return; 
                }
            }

            executeTestCase(index + 1);
        });
    };

    executeTestCase(0);
});


const io = require('socket.io')(5001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const users = new Set();

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join', (data) => {
    const { userName, roomId } = data;
    users.add({ id: socket.id, userName, roomId });
    socket.join(roomId);
    io.to(roomId).emit('user-joined', { userName });
    io.to(roomId).emit('update-user-list', Array.from(users).filter(user => user.roomId === roomId).map(user => user.userName));
  });

  socket.on('disconnect', () => {
    const user = Array.from(users).find(user => user.id === socket.id);
    if (user) {
      users.delete(user);
      io.to(user.roomId).emit('user-left', { userName: user.userName });
      io.to(user.roomId).emit('update-user-list', Array.from(users).filter(u => u.roomId === user.roomId).map(u => u.userName));
    }
  });

  socket.on('candidate', (data) => {
    const { candidate, roomId } = data;
    socket.broadcast.to(roomId).emit('candidate', data);
  });

  socket.on('offer', (data) => {
    const { offer, roomId } = data;
    socket.broadcast.to(roomId).emit('offer', data);
  });

  socket.on('answer', (data) => {
    const { answer, roomId } = data;
    socket.broadcast.to(roomId).emit('answer', data);
  });
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});