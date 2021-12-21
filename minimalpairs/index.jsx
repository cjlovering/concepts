import React from "react";
import ReactDOM from 'react-dom';
import * as d3 from "d3";
import Plot from 'react-plotly.js';

const EXPERIMENTS = [
  "default",
  "correlated"
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
      // List of all base images (options for image A)
      basics: [],
      // Minimal pairs.
      minimalpairs: [],

      // All images
      images: {},

      // Name of the selected class to filter by.
      imageA: UNSET,
      // Secondary (right) image that serves as a minimal difference.
      imageB: UNSET,
      imageC: UNSET,
    };
    this.experiments = EXPERIMENTS;

    this.updateExperiment = this.updateExperiment.bind(this);
    this.updateImageA = this.updateImageA.bind(this);
    this.updateImageB = this.updateImageB.bind(this);
    this.onDeltaHover = this.onDeltaHover.bind(this);
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
    const classA = this.state.images[name]["classname"];

    if (this.state.imageB == name) {
      // Swap.
      this.setState({
        "imageB": UNSET,
      })
    }
    this.setState({
      "imageA": name,
      "classA": classA,
      "imageB": this.state.basics.find(img => this.state.images[img]["classname"] != classA),
    })
  }
  updateImageB(event) {
    const name = event.target.name;
    if (this.state.imageA == name) {
      this.setState({
        "imageA": UNSET,
        "classA": UNSET 
      })
    }
    this.setState({
        "imageB": name,
      })
    
  }
  onDeltaHover(event) {
    const pointIndex = event.points[0].pointIndex;
    const imageC = event.points[0].data.images[pointIndex];
    this.setState({
      imageC: imageC
    })
  }

  loadExperiment(experiment) {
    d3.json(`${experiment}/experiment.json`).then(
      (data) => {
        const classA = data["images"][data["basics"][0]]["classname"];
        let experiment = data["experiment"];
        for (let val of Object.values(data.images)) {
          val["predictions"]["splatter"] = 0.0
        }
        this.setState(
          {
            experiment: experiment,
            classes: Object.keys(data['classes']),
            images: data["images"],
            basics: data["basics"],
            minimalpairs: data["minimalpairs"],
            classname: UNSET,
            imageA: data["basics"][0],
            imageB: data["basics"].find(img => data["images"][img]["classname"] != classA),
            classA: classA,
            imageC: UNSET
          }
        )

      }
    );
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
    const basicsCardA = <ImageMenu image={this.state.imageA} images={this.state.basics} imageInfo={this.state.images} update={this.updateImageA} title={"A"} />;
    const basicsCardB = <ImageMenu 
        image={this.state.imageB}
        images={this.state.basics.filter(img => this.state.images[img]["classname"] != this.state.classA)} 
        imageInfo={this.state.images} 
        update={this.updateImageB} 
        title={"B"}
      />;

    const imageASelected = this.state.imageA != UNSET;
    const imageBSelected = this.state.imageB != UNSET;
    const imageCSelected = this.state.imageC != UNSET;
  
    const imageACard = imageASelected ?  (
      <ImgCard
      title="Image A"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.images[this.state.imageA].predictions[classname]
        )}
        info={this.state.images[this.state.imageA]}
        experiment={this.state.experiment}
      />
    ) : null;

    const imageBCard = imageBSelected ? (
      <ImgCard
        title="Image B"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.images[this.state.imageB].predictions[classname]
        )}
        info={this.state.images[this.state.imageB]}
        experiment={this.state.experiment}
      />
    ) : null;

    const imageCCard = imageCSelected ? (
      <ImgCard
        title="Counterfactual(A)"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.images[this.state.imageC].predictions[classname]
        )}
        info={this.state.images[this.state.imageC]}
        experiment={this.state.experiment}
      />
    ) : null;
      
    // Move plots into a component
    let deltas = []; let x = []; let y = []; let y_orig = []; let annotations = [];
    if (imageASelected) {
      deltas = this.state.minimalpairs[this.state.imageA].map(
        imageC => deltaProbability(
          this.state.images[this.state.imageA], 
          this.state.images[imageC],
          this.state.images[this.state.imageB].classname,
          this.state.images[this.state.imageB].classname)
      );
      x = deltas.map(delta => delta["x"]);
      y = deltas.map(delta => delta["delta"]);
      y_orig = deltas.map(delta => delta["delta"]);
      annotations = deltas.map(delta => delta["annotation"]);
    }
    const notCurrentClass =  !imageBSelected ? "{Select an Image B}" : this.state.images[this.state.imageB].classname;
    const message = y.find(y => Math.abs(y) < 0.01) !== undefined ?   <div class="alert alert-warning" role="alert">When there is no change in probability, the corresponding bar is not visible.</div> : "";

    const deltaOtherPlot = !imageASelected ? null : (
      <div className="card-body">
          <Plot
          data={[
            {
              x: y,
              y: x,
              type: 'bar',
              mode: 'relative',
              orientation: 'h',
              images: this.state.minimalpairs[this.state.imageA],
              marker: {
                color: y.map(val => (val > 0) ? "#21abcd" : "#e52b50"), // blue if positive, red if negative.
                line: y_orig.map(val => (Math.abs(val) < 0.01) ? {
                  width: 5
                } : {
                  width: 0
                }
                )
              },
              text: annotations,
              hoverinfo: "text",

            },
          ]}
          layout={{width: 550, height: 350, title: `Change in probability that A is a ${notCurrentClass}`, margin: {  //Pr(Name(B) | counterfactual(A)) - Pr(Name(B) |  A) 
            l: 175,
            r: 75,
          },
          xaxis: {range: [-1.0, 1.0], autorange: false,   },
        }}
          onHover={this.onDeltaHover}
          // onUnhover={this.onDeltaUnhover}
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
          <div className="col-md-2">
            {imageACard}
          </div>
          <div className="col-md-2">
          {imageBCard}
          </div>
          <div className="col-md-2">
              {imageCCard}
          </div>
          </div>
          <div className="row">
          <div className="col-md-6.5"  style={{padding: "1px", border: "thin solid black"}}>
            {deltaOtherPlot}
          </div>
          </div>
          <hr />
        </div>
      </div >
    )
  }
}

function deltaProbability(imageFrom, imageTo, classFrom, classTo) {
  for (const [key, value] of Object.entries(imageTo.concepts)) {
    if (imageFrom.concepts[key] != value) {
      return {
        "x": `${imageFrom.concepts[key]}->${value}`, 
        "delta":(imageTo.predictions[classTo].toFixed(2) - imageFrom.predictions[classFrom]).toFixed(2),
        "annotation": (
          `${imageFrom.predictions[classFrom].toFixed(2)}->${imageTo.predictions[classTo].toFixed(2)}` 
        )
      }
    }
  }
  throw Error("Impossible. Counterfactual should differ by exactly 1 concept.")
}

function formatImagePath(image, experiment) {
  return `./${experiment}/images/${image}`;
}

function Img(image, experiment) {
  return (
    <img src={formatImagePath(image, experiment)} className="img-fluid" data-toggle="tooltip" data-placement="left" style={{padding: "1px", border: "thin solid black"}}/>
  );
}

class ImgCard extends React.Component {
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
        {Img(this.props.info.image, this.props.experiment)}
        <table style={{width: 150}}>
          {tableData}
        </table>
      </div>
    )
  }
}


class ImageMenu extends React.Component {
render() {
  const options = this.props.images.map(
    (imgname) => (
      <a
        className={this.props.image == imgname ? "dropdown-item active" : "dropdown-item"}
        key={imgname}
        name={imgname}
        onClick={this.props.update}
        checked={this.props.image == imgname}
        aria-pressed={this.props.image == imgname}
      >{this.props.imageInfo[imgname].classname} [{this.props.imageInfo[imgname].concepts.contiguous}, {this.props.imageInfo[imgname].concepts.shape}, {this.props.imageInfo[imgname].concepts.layout}, {this.props.imageInfo[imgname].concepts.stroke}, {this.props.imageInfo[imgname].concepts.color}]</a>
    )
  );
  const title = this.props.image != UNSET ? this.props.imageInfo[this.props.image].classname : this.props.images[0];
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
