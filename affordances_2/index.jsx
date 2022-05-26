import React from "react";
import ReactDOM from 'react-dom';
import * as d3 from "d3";
import Plot from 'react-plotly.js';

// Add folders that match the format of `mockdata`, 
// and put the name of those folders in the list below.
const EXPERIMENTS = [
  "20verb"
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
      basicsLookUp: {'': ''},
      // Minimal pairs.
      minimalpairs: [],

      // All videos
      videos: {},

      // Name of the selected class to filter by.
      videoA: UNSET,
      // Secondary (right) video that serves as a minimal difference.
      videoB: UNSET,
      videoC: UNSET,
      videoCName: UNSET
    };
    this.experiments = EXPERIMENTS;

    this.updateExperiment = this.updateExperiment.bind(this);
    this.updateVideoA = this.updateVideoA.bind(this);
    this.updateVideoB = this.updateVideoB.bind(this);
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

  updateVideoA(event) {
    const name = event.target.name;
    const lookupName = this.state.basicsLookUp[name];
    const classA = this.state.videos[lookupName]["classname"];

    if (this.state.videoB == name) {
      // Swap.
      this.setState({
        "videoB": UNSET,
        "videoC": UNSET,
        "videoCName": UNSET

      })
    }

    this.setState({
      "videoA": name,
      "classA": classA,
      "videoB": this.state.classes[0],
      "videoC": UNSET,
      "videoCName": UNSET
    })
  }
  updateVideoB(event) {
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
    const videoCName = event.points[0].data.y[pointIndex];
    console.log("onDeltaHover", event.points[0], event)
    this.setState({
      videoC: videoC,
      videoCName: videoCName 
    })
  }

  loadExperiment(experiment) {
    d3.json(`${experiment}/experiment.json`).then(
      (data) => {
        const classA = data["videos"][data["basics"][0]]["classname"];

        let basics = data["basics"];
        let extendedBasics = [];
        let basicsLookUp = {};

        for (let i = 0; i < basics.length; i++) {
          let videoName = basics[i];
          let video = data["videos"][videoName]
          let classifications = [];

          for (let k in video.predictions) {
            if (video.predictions[k] > 0.75) {
              classifications.push(k);
            }
          }
          // let out = "";
          // for (let k in classifications) {
          //   let classification = classifications[k];
          //   extendedBasics.push(`${classification} - ${videoName}`)
          //   basicsLookUp[`${classification} - ${videoName}`] = videoName;
          // }
          let exampleName = `${classifications.join("/")} - ${i}`;
          extendedBasics.push(exampleName);
          basicsLookUp[exampleName] = videoName;
        }
        this.setState(
          {
            experiment: experiment,
            classes: Object.keys(data['classes']),
            videos: data["videos"],
            basics: extendedBasics,
            basicsLookUp: basicsLookUp,
            minimalpairs: this.fixMinimalPairs(data["minimalpairs"]),
            classname: UNSET,
            videoA: extendedBasics[0],
            videoB: Object.keys(data['classes'])[0], // extendedBasics.find(img => data["videos"][basicsLookUp[img]]["classname"] != classA),
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
    if (this.state.experiment == UNSET){
      return (<div className="card-body">
          <p className="card-text">
          Loading...
          </p>
      </div>
      );
    }
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
    const basicsCardA = <VideoMenu 
      video={this.state.videoA} 
      videos={this.state.basics}
      videoInfo={this.state.videos} 
      basicsLookUp={this.state.basicsLookUp}
      update={this.updateVideoA} 
      title={"A"} 
    />;
    const basicsCardB = <ConceptsMenu 
        video={this.state.videoB}
        concepts={this.state.classes} 
        update={this.updateVideoB} 
        basicsLookUp={this.state.basicsLookUp}
        title={"B"}
      />;

    const videoASelected = this.state.videoA != UNSET;
    const videoBSelected = this.state.videoB != UNSET;
    const videoCSelected = this.state.videoC != UNSET;
  
    const videoAInfo = videoASelected ?  (this.state.videos[this.state.basicsLookUp[this.state.videoA]]) : null;
    const videoACard = videoASelected ?  (
      <VideoCard
      title={`Video A: ${this.state.videoA.split(" ")[0]}`}
      classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => videoAInfo.predictions[classname]
        )}
        info={videoAInfo}
        experiment={this.state.experiment}
      />
    ) : null;
    // const videoBInfo =  videoBSelected ? (
    //   this.state.videos[this.state.basicsLookUp[this.state.videoB]]
    // ) : null;
    // const videoBCard = videoBSelected ? (
    //   <VideoCard
    //     title={`Video B: ${this.state.videoB.split(" ")[0]}`}
    //     classes={this.state.classes}
    //     predictions={this.state.classes.map(
    //       classname => videoBInfo.predictions[classname]
    //     )}
    //     info={videoBInfo}
    //     experiment={this.state.experiment}
    //   />
    // ) : null;

    const videoCInfo = videoCSelected ? ( this.state.videos[this.state.videoC] ) : null;
    const videoCCard = videoCSelected ? (
      <VideoCard
        title={`Counterfactual(A): ${this.state.videoCName}`}
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => videoCInfo.predictions[classname]
        )}
        info={videoCInfo}
        experiment={this.state.experiment}
      />
    ) : null;
      
    // Move plots into a component
    let deltas = []; let x = []; let y = []; let y_orig = []; let annotations = []; let videos = [];
    if (videoASelected) {
      deltas = this.state.minimalpairs[this.state.basicsLookUp[this.state.videoA]].map(
        videoC => deltaProbability(
          this.state.videos[this.state.basicsLookUp[this.state.videoA]], 
          this.state.videos[videoC],
          this.state.videoB,
          this.state.videoB)
      );

      const featureName2Position = {
        'NoRotation': 1,
        'OffsetX': 2,
        'OffsetY': 3,
        'OffsetZ': 4,
        'LowForce': 5,
        'HighForce': 6,
        'NoDeltaX': 7,
        'SmallDeltaX': 8,
        'MedDeltaX': 9,
        'LargeDeltaX': 10,
        'NoDeltaY': 11,
        'SmallDeltaY': 12,
        'MedDeltaY': 13,
        'LargeDeltaY': 14,
        'NoDeltaZ': 15,
        'SmallDeltaZ': 16,
        'MedDeltaZ': 17,
        'LargeDeltaZ': 18,       
        'unchanged': 19,
      };

      deltas.sort((a, b) => {
        let fa = a.key,
            fb = b.key;
    
        if (featureName2Position[fa] < featureName2Position[fb]) {
            return 1;
        }
        if (featureName2Position[fa] > featureName2Position[fb]) {
            return -1;
        }
        return 0;
      });
      x = deltas.map(delta => delta["x"]);
      y = deltas.map(delta => delta["delta"]);
      annotations = deltas.map(delta => delta["annotation"]);
      videos = deltas.map(delta => delta["video"]);
    }

    // const notCurrentClass =  !videoBSelected ? "{Select an Video B}" : this.state.videos[this.state.basicsLookUp[this.state.videoB]].classname;
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
              videos: videos,
              marker: {
                color: y.map(getBarColor), // blue if positive, red if negative.
              },
              text: annotations,
              hoverinfo: "text",

            },
          ]}
          layout={{width: 300, height: 550, title: `Change in P(A) is a ${this.state.videoB}`, margin: {  //Pr(Name(B) | counterfactual(A)) - Pr(Name(B) |  A) 
            l: 100,
            r: 0,
          },
          xaxis: {range: [-1.0, 1.0], autorange: false, autosize: false   },
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
            <div class="btn-group">
              {basicsCardA}
              {basicsCardB}
              {experimentCard}
            </div>
          </div>
          <hr />
        </div>
         
        <div className="container">
          <div className="row">
            <div className="col-md-2">
              {videoACard}
            </div>
            {/* <div className="col-md-2">
              {videoBCard}
            </div> */}
            <div className="col-md-2">
                {videoCCard}
            </div>
            <div className="col-md-1">
            </div>
            <div className="col-md-4"  style={{padding: "1px", border: "thin solid black"}}>
              {deltaOtherPlot}
            </div>
          </div>
          <hr />
        </div>
      </div >
    )
  }
}
{/* <div className="row">
<div className="col-md-2">
</div>
<div className="col-md-3"  style={{padding: "1px", border: "thin solid black"}}>
{deltaOtherPlot}
</div>
</div> */}
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
  for (const [key, value] of Object.entries(videoTo.concepts)) {
    if (videoFrom.concepts[key] != value) {
      let delta = (videoTo.predictions[classTo] - videoFrom.predictions[classFrom]).toFixed(2);
      if (Math.abs(delta) < 0.05) {
        delta = 0.05;
      }
      const from = videoFrom.concepts[key] // lookupFeatureName[videoFrom.concepts[key]];
      const to = value // lookupFeatureName[value];

      let x;
      if (from == "unchanged") {
        x = to.replace("Delta", "Δ");
      } else {
        x = `${from}->${to}`;
      }
      return {
        "key": to,
        "x": x, 
        "delta": delta,
        "annotation": (
          `${videoFrom.predictions[classFrom].toFixed(2)}->${videoTo.predictions[classTo].toFixed(2)}` 
        ),
        "video": videoTo.video
      }
    }
  }
  throw Error("Impossible. Counterfactual should differ by exactly 1 concept.")
}

function formatVideoPath(video, experiment) {
  return `./${experiment}/videos/${video}`;
}

function Video(video, experiment) {
  // data-toggle="tooltip" data-placement="left" 
  //"padding": "1px", "border": "thin solid black"
  return (
    <div style={{}}> 
      <video src={formatVideoPath(video, experiment)} autoPlay muted loop width={"175px"}/> 
    </div>
  );
}

class VideoCard extends React.Component {
  render() {
    const zip = (a, b) => a.map((k, i) => [k, b[i]]);
    let zipped = zip(this.props.classes, this.props.predictions)
    let out = []
    let curr = []
    for (let i = 0; i < zipped.length; i++) {
      curr.push(zipped[i])
      if (i > 0 && i % 2 == 1) {
        out.push(curr);
        curr = [];
      } else if (i == zipped.length-1 && zipped.lenth % 2 != 0) {
        curr.push([null, null]);
        out.push(curr)
      }
    }
    const tableData = out.map(
      ([[classname, prediction], [classname2, prediction2]], index) => {
        let correct_color = "#14c523";
        let wrong_color = "#D44458";
        let maybe_color = "#FFA500";


        let cols = []
        let padding = "3px 5px";
        if ((classname == this.props.info.classname) & prediction > 0.75) {
          cols.push(
            <td key={index} style={{padding: padding,color: correct_color, fontWeight: "bold"}}>{classname}</td>,
            <td key={index+100} style={{padding: padding,color: correct_color, fontWeight: "bold"}}>{prediction.toFixed(2)}</td>)
        } else if ((classname == this.props.info.classname) & prediction <= 0.75) {
          cols.push(
            <td key={index} style={{padding: padding,color: wrong_color, fontWeight: "bold"}}>{classname}</td>,
            <td key={index+100} style={{padding: padding,color: wrong_color, fontWeight: "bold"}}>{prediction.toFixed(2)}</td>)
        } else if (prediction > 0.75) {
          cols.push(
            <td key={index} style={{padding: padding,color: maybe_color, fontWeight: "bold"}}>{classname}</td>,
            <td key={index+100} style={{padding: padding,color: maybe_color, fontWeight: "bold"}}>{prediction.toFixed(2)}</td>)
        } else {
          cols.push(<td  style={{padding: padding,color: "black"}}>{classname}</td>, 
                  <td style={{padding: padding,color: "black"}}>{prediction.toFixed(2)}</td>)
        }

        if (classname2 != null) {
          if ((classname2 == this.props.info.classname) & prediction2 > 0.75) {
            cols.push(
              <td key={index * 1000 + 1000} style={{padding: padding,color: correct_color, fontWeight: "bold"}}>{classname2}</td>,
              <td key={index* 1000 + 100000} style={{padding: padding,color: correct_color, fontWeight: "bold"}}>{prediction2.toFixed(2)}</td>)
          } else if ((classname2 == this.props.info.classname) & prediction2 <= 0.75) {
            cols.push(
              <td key={index* 1000 + 1000} style={{padding: padding,color: wrong_color, fontWeight: "bold"}}>{classname2}</td>,
              <td key={index* 1000 + 100000} style={{padding: padding,color: wrong_color, fontWeight: "bold"}}>{prediction2.toFixed(2)}</td>)
          } else if (prediction2 > 0.75) {
            cols.push(
              <td key={index* 1000 + 1000} style={{padding: padding,color: maybe_color, fontWeight: "bold"}}>{classname2}</td>,
              <td key={index* 1000 + 100000} style={{padding: padding,color: maybe_color, fontWeight: "bold"}}>{prediction2.toFixed(2)}</td>)
          } else {
            cols.push(<td key={index* 1000 + 100000} style={{padding: padding,color: "black"}}>{classname2}</td>, <td style={{padding: padding,color: "black"}}>{prediction2.toFixed(2)}</td>)
          }
      }
        return <tr key={index* 1000 + 200000}> {cols} </tr>;
      }
    )
    return (
      <div className="card-body">
          <p className="card-text" style={{width: 110, wordWrap: "normal"}}>
            {this.props.title}
          </p>
        {Video(this.props.info.video, this.props.experiment)}
        <table style={{width: 150, fontSize: "0.7rem"}}>
          {tableData}
        </table>
      </div>
    )
  }
}


class VideoMenu extends React.Component {
  render() {
    const options = this.props.videos.map(
      (imgname, i) => (
        <a
          className={this.props.video == imgname ? "dropdown-item active" : "dropdown-item"}
          key={imgname}
          name={imgname}
          onClick={this.props.update}
          checked={this.props.video == imgname}
          aria-pressed={this.props.video == imgname}
        >{imgname}</a>
      )// this.props.videoInfo[this.props.basicsLookUp[this.props.video]].classname
    );
    let title = this.props.video != UNSET ? this.props.video : this.props.videos[0];
    title = title.replace(".mp4", "");
    title = title.replace("_None", "").split(" ")[0];
    return (
      <div>
        <div className="card-body">
          <p className="card-text">
            Select Video {this.props.title}.
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


class ConceptsMenu extends React.Component {
  render() {
    const options = this.props.concepts.map(
      (imgname, i) => (
        <a
          className={this.props.video == imgname ? "dropdown-item active" : "dropdown-item"}
          key={imgname}
          name={imgname}
          onClick={this.props.update}
          checked={this.props.video == imgname}
          aria-pressed={this.props.video == imgname}
        >{imgname}</a>
      )// this.props.videoInfo[this.props.basicsLookUp[this.props.video]].classname
    );
    let title = this.props.video != UNSET ? this.props.video : this.props.videos[0];
    return (
      <div>
        <div className="card-body">
          <p className="card-text">
            Select Video {this.props.title}.
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
