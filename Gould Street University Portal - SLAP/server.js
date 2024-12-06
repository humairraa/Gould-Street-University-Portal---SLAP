const express = require("express");
const multer = require("multer");
const path = require("path");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const app = express();

// Create a DynamoDB client
const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: "us-east-2",
  }),
  {
    // Automatically removes undefined values (for DynamoDB)
    marshallOptions: {
      removeUndefinedValues: true,
    },
  }
);

// Configure multer for file upload handling for task6.html (assignment submission)
// The destination folder is 'uploads/'
// The maximum file size is 10MB
const assignmentUploads = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Tells the Express server to automatically parse JSON data in the body of HTTP requests
app.use(express.json());

// Sets up a route in an Express server when the user access the URL '/' of the server
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Just so that I can access GroupCreationInterface.html
app.get("/task15", (req, res) => {
  res.sendFile(path.join(__dirname, "task15.html"));
});

// Sets up a route in an Express server when the user access the URL '/task16' of the server
app.get("/task16", (req, res) => {
  res.sendFile(path.join(__dirname, "task16.html"));
});

// Sets up a route in an Express server when the user access the URL '/task6' of the server
app.get("/task6", (req, res) => {
  res.sendFile(path.join(__dirname, "task6.html"));
});

// Sets up a route in an Express server when the user access the URL '/task19' of the server
app.get("/task19", (req, res) => {
  res.sendFile(path.join(__dirname, "task19.html"));
});

// Sets up a route in an Express server when the user access the URL '/task18' of the server
app.get("/task18", (req, res) => {
  res.sendFile(path.join(__dirname, "task18.html"));
});

// Sets up a route in an Express server when the user access the URL '/task17' of the server
app.get("/task17", (req, res) => {
  res.sendFile(path.join(__dirname, "task17.html"));
});

/
// Sets up a file upload route to handle POST requests to the '/submit-assignment' endpoint
// Uses the single() method from the configured multer instance from earlier in this file
// Returns an error if there is no file uploaded
app.post(
  "/submit-assignment",
  assignmentUploads.single("assignment"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }
    console.log("The file was successfully uploaded:", req.file);
    res.send("Assignment submitted successfully.");
  }
);

// Sets up a POST route at '/create-group' where incoming requests will be processed by an async function
// The request body is destructured
// A unique groupId (partition key) is created using uuidv4()
// Posting the information to the 'Project-Groups' table in DynamoDB
// Project-Groups holds information on groups, the group name, the class the group is in, the project selected and members of the group
// If the attempt fails, an error message appears
// This is used for task15.html
app.post("/create-group", async (req, res) => {
  console.log("This is the request body:", req.body); // look @ request body

  const { courseSelected, projectSelected, decidedGroupName, students } =
    req.body;

  const groupId = uuidv4();

  const params = {
    TableName: "Project-Groups",
    Item: {
      Group_ID: groupId,
      Class: courseSelected,
      Project_Selected: projectSelected,
      GroupName: decidedGroupName,
      Students: students,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json({ message: "The group was created successfully!" });
  } catch (error) {
    console.error(
      "Unfortunately, there was an error in creating your group in DynamoDB:",
      error
    );
    res.status(500).json({ error: "Unfortunately, group creation failed." });
  }
});

// Sets up a GET route at '/retrieve-projects' where incoming requests will be processed by an async function
// ScanCommand from DynamoDB is used to retrieve all the items from the DynamoDB table 'Project-Groups'
// Project-Groups holds information on groups, the group name, the class the group is in, the project selected and members of the group
// If the attempt fails, an error message appears
// This is used for task16.html and task18.html
app.get("/retrieve-projects", async (req, res) => {
  const params = {
    TableName: "Project-Groups",
  };

  try {
    const response = await docClient.send(new ScanCommand(params));

    if (response.Items && response.Items.length > 0) {
      res.json(response.Items);
    } else {
      res.status(404).send("Unfortunately, there were no projects found.");
    }
  } catch (error) {
    console.error(
      "Unfortunately, there was an error fetching projects from DynamoDB:",
      error
    );
    res
      .status(500)
      .send(
        "Unfortunately, there was an error fetching projects from DynamoDB."
      );
  }
});

// Sets up a GET route at '/retrieve-projects-group' where incoming requests will be processed by an async function
// ScanCommand from DynamoDB is used to retrieve all project groups associated with a specific project from the DynamoDB table 'Project-Groups'
// Project-Groups holds information on groups, the group name, the class the group is in, the project selected and members of the group
// If the attempt fails, an error message appears
// This is used for task16.html
app.get("/retrieve-project-groups", async (req, res) => {
  const { project: projectSelected } = req.query;
  console.log("Project Selected:", projectSelected);

  if (!projectSelected) {
    return res.status(400).send("Project parameter is required.");
  }

  const params = {
    TableName: "Project-Groups",
    FilterExpression: "Project_Selected = :projectSelected",
    ExpressionAttributeValues: {
      ":projectSelected": projectSelected,
    },
  };

  try {
    const response = await docClient.send(new ScanCommand(params));

    if (response.Items && response.Items.length > 0) {
      const projects = response.Items.map((item) => item);

      res.json(projects);
    } else {
      res.status(404).send("Unfortunately, the project groups were not found.");
    }
  } catch (error) {
    console.error(
      "Unfortunately, there was an error fetching project groups from DynamoDB:",
      error
    );
    res
      .status(500)
      .send(
        "Unfortunately, there was an error fetching project groups from DynamoDB."
      );
  }
});

// Sets up a GET route at '/studentsRetrieval' where incoming requests will be processed by an async function
// ScanCommand from DynamoDB is used to retrieve all the students in a course/class from the DynamoDB table 'Students'
// Project-Groups holds information on groups, the group name, the class the group is in, the project selected and members of the group
// If the attempt fails, an error message appears
// This is used for task15.html
app.get("/studentsRetrieval", async (req, res) => {
  const { course: courseSelected } = req.query;
  console.log("The course selected is:", courseSelected);

  if (!courseSelected) {
    return res.status(400).send("The course parameter is required.");
  }

  const params = {
    TableName: "Students",
    FilterExpression: "Course = :courseSelected",
    ExpressionAttributeValues: {
      ":courseSelected": courseSelected,
    },
  };

  try {
    const response = await docClient.send(new ScanCommand(params));

    if (response.Items && response.Items.length > 0) {
      const students = response.Items.map((item) => item);

      res.json(students);
    } else {
      res.status(404).send("Unfortunately, no students were found.");
    }
  } catch (error) {
    console.error(
      "Unfortunately, there was an error in fetching students from DynamoDB:",
      error
    );
    res
      .status(500)
      .send(
        "Unfortunately, there was an error in fetching students from DynamoDB."
      );
  }
});

// Code to Upload Assignment instructions to a dropbox and then post corresponding information to table (task17.html)
// Destination folder is called 'assignment_instructions'
// The max file size is 10 MB
const upload_assignment_instructions = multer({
  dest: "assignment_instructions/",
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Sets up a POST route at '/submit-assignment-instructions' where incoming requests will be processed by an async function
// Uses the single() method from the configured multer instance from earlier in this file to upload the file to a destination
// Returns an error if there is no file uploaded
// The original file name and saved file name (both are different) are saved and logged
// This is used for task17.html
app.post(
  "/submit-assignment-instructions",
  upload_assignment_instructions.single("assignment"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).send("Assignment instructions were not uploaded.");
    }

    const originalFilename = req.file.originalname;
    const savedFilename = req.file.filename;

    console.log("This is the original file name:", originalFilename);
    console.log("This is the saved file name on the server:", savedFilename);

    res.status(200).json({
      message: "Assignment instructions submitted successfully.",
      originalFilename: originalFilename,
      savedFilename: savedFilename,
    });
  }
);

// Sets up a POST route at '/assignment-instructions-information' where incoming requests will be processed by an async function
// The request body is decomposed
// A date object is created and used to record the current time
// The partition key is uniqueProjectID created using uuidv4()
// Information is posted to the 'Project-Names' table
// Project-Names holds information on course a project belongs to, the project instruction filenames, project name and when the assignment instruction docs were uploaded
// PutCommand from DynamoDB is used to POST new information into the Project-Names table
// Used for task17.html and task18.html
app.post("/assignment-instructions-information", async (req, res) => {
  const { originalFilename, savedFilename, courseName, projectName } = req.body;

  const theCurrentDate = new Date();
  const theFormattedDate = theCurrentDate.toISOString().split("T")[0];
  const theFormattedTime = theCurrentDate.toTimeString().split(" ")[0];

  const uniqueProjectID = uuidv4();

  const params = {
    TableName: "Project-Names",
    Item: {
      Project_ID: uniqueProjectID,
      Original_Filename: originalFilename,
      Saved_Filename: savedFilename,
      Course_Name: courseName,
      Project_Name: projectName,
      Submission_Date_Time: `${theFormattedDate} ${theFormattedTime}`,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res
      .status(201)
      .json({
        message:
          "The assignment instructions information was logged successfully!",
      });
  } catch (error) {
    console.error(
      "Unfortunately, our attempts to log information in DynamoDB was unsuccessful:",
      error
    );
    res
      .status(500)
      .json({
        error:
          "Unfortunately, our attempts to upload assignment instructions information in DynamoDB has failed",
      });
  }
});

// Sets up a GET route at '/get-assignment-instructions-information' where incoming requests will be processed by an async function
// ScanCommand from DynamoDB is used to retrieve all the entries from the DynamoDB table 'Project-Names'
// Project-Names holds information on course a project belongs to, the project instruction filenames, project name and when the assignment instruction docs were uploaded
// If the attempt fails, an error message appears
// This is used for task18.html
app.get("/get-assignment-instructions-information", async (req, res) => {
  const params = {
    TableName: "Project-Names",
  };

  try {
    const response = await docClient.send(new ScanCommand(params));

    if (response.Items.length > 0) {
      res.status(200).json(response.Items);
    } else {
      res
        .status(404)
        .json({
          message: "Unfortunately, no assignment instructions were found.",
        });
    }
  } catch (error) {
    console.error(
      "Unfortunately, there was an error in retrieving assignment instructions information:",
      error
    );
    res
      .status(500)
      .json({
        error:
          "Unfortunately, our attempts to retrieve assignment instructions information from DynamoDB failed.",
      });
  }
});

// Sets up a POST route at '/submit-evaluation' where incoming requests will be processed by an async function
// The request body is destructured
// A unique evaluationId (partition key) is created using uuidv4()
// Posting the information to the 'Student-Evaluations' table in DynamoDB using PutCommand
// Student-Evaluations holds information on course, evaluation comments, grade received, project name
// If the attempt fails, an error message appears
// This is used for task18.html
app.post("/submit-evaluation", async (req, res) => {
  const { course, project, group, grade, evaluation } = req.body;
  const evaluationId = uuidv4();

  const params = {
    TableName: "Student-Evaluations",
    Item: {
      Evaluation_ID: evaluationId,
      Course: course,
      Project: project,
      Group: group,
      Grade: grade,
      Evaluation: evaluation,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res
      .status(201)
      .json({ message: "The evaluation was submitted successfully!" });
  } catch (error) {
    console.error(
      "Unfortunately, there was an error in submitting the evaluation to DynamoDB:",
      error
    );
    res
      .status(500)
      .json({
        error:
          "Unfortunately, there was an error in submitting the evaluation to DynamoDB.",
      });
  }
});

// Launches the server on PORT 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
