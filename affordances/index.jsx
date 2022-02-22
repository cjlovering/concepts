import React from "react";
import ReactDOM from 'react-dom';
import * as d3 from "d3";
import Plot from 'react-plotly.js';

// Add folders that match the format of `mockdata`, 
// and put the name of those folders in the list below.
const EXPERIMENTS = [
  "default"
]

const UNSET = ""

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // Name of the experiments
      experiment: "",
      // List of all classes.
      classes: [],
      // List of all base videos (options for video A)
      basics: [],
      // Minimal pairs.
      minimalpairs: [],

      // All videos
      videos: {},

      // Name of the selected class to filter by.
      videoA: UNSET,
      // Secondary (right) video that serves as a minimal difference.
      videoB: UNSET,
      videoC: UNSET,
    };
    this.experiments = EXPERIMENTS;

    this.updateExperiment = this.updateExperiment.bind(this);
    this.updateImageA = this.updateImageA.bind(this);
    this.updateImageB = this.updateImageB.bind(this);
    this.onDeltaHover = this.onDeltaHover.bind(this);
    this.fixMinimalPairs = this.fixMinimalPairs.bind(this);
  }

  componentDidMount() {
    // Load the last experiment.
    if (this.experiments.length > 0) {
      this.loadExperiment(this.experiments[0]);
    }
  }

  updateExperiment(event) {
    const target = event.target;
    const experiment = target.name;
    this.loadExperiment(experiment);
  }

  updateImageA(event) {
    const name = event.target.name;
    const classA = this.state.videos[name]["classname"];

    if (this.state.videoB == name) {
      // Swap.
      this.setState({
        "videoB": UNSET,
      })
    }
    this.setState({
      "videoA": name,
      "classA": classA,
      "videoB": this.state.basics.find(img => this.state.videos[img]["classname"] != classA),
    })
  }
  updateImageB(event) {
    const name = event.target.name;
    if (this.state.videoA == name) {
      this.setState({
        "videoA": UNSET,
        "classA": UNSET 
      })
    }
    this.setState({
        "videoB": name,
      })
    
  }
  onDeltaHover(event) {
    const pointIndex = event.points[0].pointIndex;
    const videoC = event.points[0].data.videos[pointIndex];
    this.setState({
      videoC: videoC
    })
  }

  loadExperiment(experiment) {
    d3.json(`${experiment}/experiment.json`).then(
      (data) => {
        const classA = data["videos"][data["basics"][0]]["classname"];
        for (let val of Object.values(data.videos)) {
          val["predictions"]["splatter"] = 0.0
        }
        this.setState(
          {
            experiment: experiment,
            classes: Object.keys(data['classes']),
            videos: data["videos"],
            basics: data["basics"],
            minimalpairs: this.fixMinimalPairs(data["minimalpairs"]),
            classname: UNSET,
            videoA: data["basics"][0],
            videoB: data["basics"].find(img => data["videos"][img]["classname"] != classA),
            classA: classA,
            videoC: UNSET
          }
        )

      }
    );
  }

  fixMinimalPairs(minimalpairs) {
    let out = {}
    for (const [key, value] of Object.entries(minimalpairs)) {
      out[key] = value.filter(x => key != x)
    }
    return out;
  }

  render() {
    const experiments = this.experiments.map(
      (experiment) => (
        <a
          className={this.state.experiment == experiment ? "dropdown-item active" : "dropdown-item"}
          key={experiment}
          name={experiment}
          onClick={this.updateExperiment}
          checked={this.state.experiment == experiment}
          // aria-pressed={this.state.pivot == experiment}
        >{experiment}</a>
      )
    );
    const experimentCard = (
      <div>
        <div className="card-body">
          <p className="card-text">
            Select dataset.
          </p>
          <div className="dropdown">
            <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              {this.state.experiment}
            </button>
            <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
              {experiments}
            </div>
          </div>
        </div>
      </div>
    );
    const basicsCardA = <ImageMenu video={this.state.videoA} videos={this.state.basics} videoInfo={this.state.videos} update={this.updateImageA} title={"A"} />;
    const basicsCardB = <ImageMenu 
        video={this.state.videoB}
        videos={this.state.basics.filter(img => this.state.videos[img]["classname"] != this.state.classA)} 
        videoInfo={this.state.videos} 
        update={this.updateImageB} 
        title={"B"}
      />;

    const videoASelected = this.state.videoA != UNSET;
    const videoBSelected = this.state.videoB != UNSET;
    const videoCSelected = this.state.videoC != UNSET;
  
    const videoACard = videoASelected ?  (
      <VideoCard
      title="Image A"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.videos[this.state.videoA].predictions[classname]
        )}
        info={this.state.videos[this.state.videoA]}
        experiment={this.state.experiment}
      />
    ) : null;

    const videoBCard = videoBSelected ? (
      <VideoCard
        title="Image B"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.videos[this.state.videoB].predictions[classname]
        )}
        info={this.state.videos[this.state.videoB]}
        experiment={this.state.experiment}
      />
    ) : null;

    const videoCCard = videoCSelected ? (
      <VideoCard
        title="Counterfactual(A)"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.videos[this.state.videoC].predictions[classname]
        )}
        info={this.state.videos[this.state.videoC]}
        experiment={this.state.experiment}
      />
    ) : null;
      
    // Move plots into a component
    let deltas = []; let x = []; let y = []; let y_orig = []; let annotations = [];
    if (videoASelected) {
      console.log(this.state.minimalpairs[this.state.videoA], this.state.videos)
      deltas = this.state.minimalpairs[this.state.videoA].map(
        videoC => deltaProbability(
          this.state.videos[this.state.videoA], 
          this.state.videos[videoC],
          this.state.videos[this.state.videoB].classname,
          this.state.videos[this.state.videoB].classname)
      );
      console.log("before", deltas)
      deltas.sort((a, b) => {
        let fa = a.key.toLowerCase(),
            fb = b.key.toLowerCase();
    
        if (fa < fb) {
            return -1;
        }
        if (fa > fb) {
            return 1;
        }
        return 0;
      });
      console.log("deltas", deltas)
      x = deltas.map(delta => delta["x"]);
      y = deltas.map(delta => delta["delta"]);
      annotations = deltas.map(delta => delta["annotation"]);
    }

    const notCurrentClass =  !videoBSelected ? "{Select an Image B}" : this.state.videos[this.state.videoB].classname;
    const message = y.find(y => Math.abs(y) < 0.01) !== undefined ?   <div class="alert alert-warning" role="alert">When there is no change in probability, the corresponding bar is not visible.</div> : "";

    const deltaOtherPlot = !videoASelected ? null : (
      <div className="card-body">
          <Plot
          data={[
            {
              x: y,
              y: x,
              type: 'bar',
              mode: 'relative',
              orientation: 'h',
              videos: this.state.minimalpairs[this.state.videoA],
              marker: {
                color: y.map(getBarColor), // blue if positive, red if negative.
              },
              text: annotations,
              hoverinfo: "text",

            },
          ]}
          layout={{width: 525, height: 600, title: `Change in probability that A is a ${notCurrentClass}`, margin: {  //Pr(Name(B) | counterfactual(A)) - Pr(Name(B) |  A) 
            l: 245,
            r: 25,
          },
          xaxis: {range: [-1.0, 1.0], autorange: false,   },
        }}
          onHover={this.onDeltaHover}
        />
        {message}
        </div>
    )
    return (
      <div>
        <div className="container">
          <div className="row">
            <div className="col-md-2">
              {basicsCardA}
            </div>
            <div className="col-md-2">
              {basicsCardB}
            </div>
            <div className="col-md-2">
              {experimentCard}
            </div>
          </div>
          <hr />
        </div>
         
        <div className="container">
          <div className="row">
          <div className="col-md-6">
            {videoACard}
          </div>
          <div className="col-md-6">
          {videoBCard}
          </div>

          </div>
          <div className="row">
          <div className="col-md-6"  style={{padding: "1px", border: "thin solid black"}}>
            {deltaOtherPlot}
          </div>
          <div className="col-md-6">
              {videoCCard}
          </div>
          </div>
          <hr />
        </div>
      </div >
    )
  }
}

function getBarColor(val) {
  if (Math.abs(val) <= 0.05) {
    return "#ff8c00"
  } else if (val < 0) {
    return "#e52b50"
  } else {
    return "#21abcd"
  }
  // blue if positive, red if negative.
}

function deltaProbability(videoFrom, videoTo, classFrom, classTo) {

  // softPush
  // bundle.js:1 heavier
  // bundle.js:1 softestPush
  // bundle.js:1 middleY

  const lookupFeatureName = {
    "farLeft":"shifted far left",
    "left": "shifted left",
    "middleX": "start at x axis=0",
    "middleY": "start at y axis=0",
    "right": "shifted right",
    "farRight": "shifted far right",
    "farBack": "shifted far back",
    "back": "shifted back",
    "middleZ": "start at z axis=0",
    "forward": "shifted forward",
    "farForward": "shifted far forward",
    "lightest": "lowest mass",
    "lighter": "low mass",
    "normalMass": "medium mass",
    "heavy": "high mass",
    "heavier": "high mass",
    "heaviest": "highest mass",
    "lightestPush": "very gentle push",
    "lightPush": "gentle push",
    "normalPush": "medium push",
    "hardPush": "hard push",
    "softPush": "soft push",
    "softestPush": "very soft push",
    "normalPhys": "normal rolling physics",
    "noRoll": "angular rotation locked",
    "rolling": "object 'rounded'",
    "can't roll": "not round",
    "can roll": "round",
    "box":"box",
    "plate": "plate",
    "book": "book",
    "bucky ball": "bucky ball",
    "soccer ball":"soccer ball",
    "bomb ball":"bomb ball"
  }    
  for (const [key, value] of Object.entries(videoTo.concepts)) {
    if (videoFrom.concepts[key] != value) {
      let delta = (videoTo.predictions[classTo] - videoFrom.predictions[classFrom]).toFixed(2);
      if (Math.abs(delta) < 0.05) {
        delta = 0.05;
      }
      if (!(videoFrom.concepts[key] in lookupFeatureName)) {
        console.log(videoFrom.concepts[key])
      }
      if (!(value in lookupFeatureName)) {
        console.log(value)
      }
      const from = lookupFeatureName[videoFrom.concepts[key]];
      const to = lookupFeatureName[value];
      return {
        "key": from,
        "x": `${from}->${to}`, 
        "delta": delta,
        "annotation": (
          `${videoFrom.predictions[classFrom].toFixed(2)}->${videoTo.predictions[classTo].toFixed(2)}` 
        )
      }
    }
  }
  throw Error("Impossible. Counterfactual should differ by exactly 1 concept.")
}

function formatVideoPath(video, experiment) {
  return `./${experiment}/videos/${video}`;
}

function Video(video, experiment) {
  return (
    <div style={{"overflow": "hidden", "padding": "1px", "border": "thin solid black"}}>
      <video src={formatVideoPath(video, experiment)} autoPlay muted loop width={"1000px"} data-toggle="tooltip" data-placement="left" style={{
        marginTop: "-20%", marginLeft: "-45%", marginBottom: "-20%"
        }}/>
    </div>
  );
}

class VideoCard extends React.Component {
  render() {
    const zip = (a, b) => a.map((k, i) => [k, b[i]]);
    const tableData = zip(this.props.classes, this.props.predictions).map(
      ([classname, prediction], index) => {
        let color;
        if (prediction > 0.5) {
          color = "#14c523";
        } else {
          color = "#D44458";
        }
        if (classname == this.props.info.classname) {
          return <tr key={index}> 
            <td style={{color: color, fontWeight: "bold"}}>{classname}</td> 
            <td style={{color: color, fontWeight: "bold"}}>{prediction.toFixed(2)}</td>
          </tr>
        } else {
          return <tr key={index}> <td  style={{color: "black"}}>{classname}</td> <td>{prediction.toFixed(2)}</td></tr>
        }
      }
    )
    return (
      <div className="card-body">
          <p className="card-text">
            {this.props.title}
          </p>
        {Video(this.props.info.video, this.props.experiment)}
        <table style={{width: 150}}>
          {tableData}
        </table>
      </div>
    )
  }
}


class ImageMenu extends React.Component {
render() {
  console.log("ImageMenu")
  const options = this.props.videos.map(
    (imgname) => (
      <a
        className={this.props.video == imgname ? "dropdown-item active" : "dropdown-item"}
        key={imgname}
        name={imgname}
        onClick={this.props.update}
        checked={this.props.video == imgname}
        aria-pressed={this.props.video == imgname}
      >{this.props.videoInfo[imgname].classname} [{this.props.videoInfo[imgname].concepts.contiguous}, {this.props.videoInfo[imgname].concepts.shape}, {this.props.videoInfo[imgname].concepts.layout}, {this.props.videoInfo[imgname].concepts.stroke}, {this.props.videoInfo[imgname].concepts.color}]</a>
    )
  );
  const title = this.props.video != UNSET ? this.props.videoInfo[this.props.video].classname : this.props.videos[0];
  return (
    <div>
      <div className="card-body">
        <p className="card-text">
          Select Image {this.props.title}.
        </p>
        <div className="dropdown">
          <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            {title}
          </button>
          <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
            {options}
          </div>
        </div>
      </div>
    </div>
  );
}
}


const domContainer = document.querySelector('#entry');

ReactDOM.render(
  React.createElement(App),
  domContainer
);
