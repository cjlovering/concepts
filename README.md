# concepts

## setup

Build client-side js bundle, setup for file server.

```
npm install
npm run build
./serve.sh  # for local, perhaps in a different terminal tab.
```


```
cd milestone3
rsync cloverin@ssh.ccv.brown.edu:/users/cloverin/data/cloverin/projects/gaila/data/t1_milestone3/\* images/
rsync cloverin@ssh.ccv.brown.edu:/users/cloverin/data/cloverin/projects/gaila/results/ft-2021-12-07/milestone3-t1-ba:256-n_:10-se:42-fi:li-pr:RN-sa:1000-da:t1.json experiment.json
```