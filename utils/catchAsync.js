const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err));
  };
};

module.exports = catchAsync;

/* 
error sources
1. new AppError --> create error manually
access both err.statusCode, err.message
------------------------------------------------------
-cannot find the url
- find one tour

2. catch(err) --> create error automatically
access only err.message
------------------------------------------------------
-async handler functions
*/
