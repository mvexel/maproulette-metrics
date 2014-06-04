maproulette-metrics
===================

This shows metrics for MapRoulette. For it to work, CORS needs to be enabled on maproulette.org to wherever this is hosted.

# Developing

    grunt serve

# Building

    npm install
    bower install
    grunt build

# Deploying

Create `s3.json` in the root dir:

    {
    	"key": "AWS_KEY",
    	"secret": "AWS_SECRET_KEY"
		"buckets":
		{
			"stage": "maproulette-metrics-stage",
			"prod": "maproulette-metrics-production"
		}
    }

...supplying your own keys.

Then,

    grunt deploy

to deploy on stage, or

    grunt deploy --target=prod

to deploy on production.