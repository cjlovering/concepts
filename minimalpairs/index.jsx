import React from "react";
import ReactDOM from 'react-dom';
import * as d3 from "d3";
import Plot from 'react-plotly.js';

const EXPERIMENTS = [
  "milestone3"
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
      this.loadExperiment(this.experiments[this.experiments.length - 1]);
    }
  }

  updateExperiment(event) {
    const target = event.target;
    const experiment = target.name;
    this.loadExperiment(experiment);
  }

  updateImageA(event) {
    const name = event.target.name;
    if (this.state.imageB == name) {
      // Swap.
      this.setState({
        "imageA": name,
        "imageB": this.state.imageA
      })
    } else {
      this.setState({
        "imageA": name,
      })
    }
  }
  updateImageB(event) {
    const name = event.target.name;
    if (this.state.imageA == name) {
      // Swap.
      this.setState({
        "imageB": name,
        "imageA": this.state.imageB
      })
    } else {
      this.setState({
        "imageB": name,
      })
    }    
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
        console.log(data)
        this.setState(
          {
            experiment: data["experiment"],
            classes: Object.keys(data['classes']),
            images: data["images"],
            basics: data["basics"],
            minimalpairs: data["minimalpairs"],
            classname: UNSET,
            imageA: data["basics"][0],
            imageB: data["basics"][1],
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
            Select an experiment.
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

    const basicsCardA = <ImageMenu image={this.state.imageA} images={this.state.basics} update={this.updateImageA} title={"A"} />;
    const basicsCardB = <ImageMenu image={this.state.imageB} images={this.state.basics} update={this.updateImageB} title={"B"} />;

    const imageASelected = this.state.imageA != UNSET;
    const imageBSelected = this.state.imageB != UNSET;
    const imageCSelected = this.state.imageC != UNSET;
  
    const imageACard = imageASelected ?  (
      <ImgCard
      title="Image A"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.images[this.state.imageA].predictions["clip"][classname]
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
          classname => this.state.images[this.state.imageB].predictions["clip"][classname]
        )}
        info={this.state.images[this.state.imageB]}
        experiment={this.state.experiment}
      />
    ) : null;

    const imageCCard = imageCSelected ? (
      <ImgCard
        title="Counterfactual of Image A"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.images[this.state.imageC].predictions["clip"][classname]
        )}
        info={this.state.images[this.state.imageC]}
        experiment={this.state.experiment}
      />
    ) : null;

    let predictions = []; let deltas = []; let x = []; let y = []; let annotations = [];
    if (imageASelected) {
      predictions = this.state.classes.map(
        classname => this.state.images[this.state.imageA].predictions["clip"][classname]
      )
      deltas = this.state.minimalpairs[this.state.imageA].map(
        imageC => deltaProbability(
          this.state.images[this.state.imageA], 
          this.state.images[imageC],
          this.state.images[this.state.imageA].classname,
          this.state.images[this.state.imageA].classname)
      );
      x = deltas.map(delta => delta["x"]);
      y = deltas.map(delta => delta["delta"]);
      annotations = deltas.map(delta => delta["annotation"]);
    }

    const deltaSelfPlot = !imageASelected ? null : (
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
                color: y.map(val => (val > 0) ? "#21abcd" : "#e52b50") // blue if positive, red if negative.
              },
              text: annotations,
              hoverinfo: "text"
            },
          ]}
          layout={{width: 550, height: 350, title: `Pr(Name(A) | counterfactual(A)) - Pr(Name(A) |  A) `, margin: {
            l: 175,
            r: 75
          }}}
          onHover={this.onDeltaHover}
        />
        </div>
    )
      
    // Move plots into a component
    deltas = []; x = []; y = []; annotations = [];
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
      annotations = deltas.map(delta => delta["annotation"]);
    }
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
                color: y.map(val => (val > 0) ? "#21abcd" : "#e52b50") // blue if positive, red if negative.
              },
              text: annotations,
              hoverinfo: "text"
            },
          ]}
          layout={{width: 550, height: 350, title: `Pr(Name(B) | counterfactual(A)) - Pr(Name(B) |  A) `, margin: {
            l: 175,
            r: 75
          }}}
          onHover={this.onDeltaHover}
          // onUnhover={this.onDeltaUnhover}
        />
        </div>
    )

    return (
      <div>
        <div className="container">
          <div className="row">
            <div className="col-md-4">
              {experimentCard}
            </div>
          </div>
          <div className="row">
            <div className="col-md-2">
              {basicsCardA}
            </div>
            <div className="col-md-2">
              {basicsCardB}
            </div>
          </div>
        </div>
        <hr />
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
          <div className="col-md-4">
            {deltaOtherPlot}
          </div>
          </div>
        </div>
      </div >
    )
  }
}

function deltaProbability(imageFrom, imageTo, classFrom, classTo) {
  for (const [key, value] of Object.entries(imageTo.concepts)) {
    if (imageFrom.concepts[key] != value) {
      return {
        // ${key}:\n
        "x": `${imageFrom.concepts[key]}->${value}`, 
        "delta": (
          imageTo.predictions["clip"][classTo] - imageFrom.predictions["clip"][classFrom]),
        "annotation": (
          `${imageFrom.predictions["clip"][classFrom]}->${imageTo.predictions["clip"][classTo]}` 
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
    <img src={formatImagePath(image, experiment)} className="img-fluid" data-toggle="tooltip" data-placement="left" style="padding:1px;border:thin solid black;" />
  );
}

class ImgCard extends React.Component {
  render() {
    const sorted_classes = this.props.classes.sort(
      (a, b) => {
        const valueA = this.props.info.predictions["clip"][a];
        const valueB = this.props.info.predictions["clip"][b];
        return valueB - valueA
      }
    );
    const columns = sorted_classes.map(
      (classname, index) => {
        const color = (classname == this.props.info.classname)? "#1E1EA9" : "#585858";
        return <th key={index} style={{color: color}}>{classname}</th>
      }
    )
    const predictions = sorted_classes.map(
      (classname, index) => {
        return <td key={index}>{this.props.info.predictions["clip"][classname]}</td>
      }
    )
    return (
      <div className="card-body">
          <p className="card-text">
            {this.props.title}
          </p>
        {Img(this.props.info.image, this.props.experiment)}
        <table style={{width: 150}}>
          <tr>
            {columns}
          </tr>
          <tr>
            {predictions}
          </tr>
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
      >{imgname}</a>
    )
  );
  return (
    <div>
      <div className="card-body">
        <p className="card-text">
          Select Image {this.props.title}.
        </p>
        <div className="dropdown">
          <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            {this.props.image}
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
