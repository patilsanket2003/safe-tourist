const EFIR = require('../../models/EFIR');
const Authority = require('../../models/Authority');

// @desc    Get e-FIR list (main details only)
// @route   GET /api/authority/efir
// @access  Private (authority)
exports.getEFIRSummaries = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const status = req.query.status;

    const query = {};
    if (status) {
      query.status = status;
    }

    const efirs = await EFIR.find(query)
      .sort({ filedAt: -1 })
      .limit(limit)
      .select(
        '_id touristId touristName countryOfOrigin incidentType status filedAt submittedBy.fullName submittedBy.authorityId',
      )
      .lean();

    const data = efirs.map((item) => ({
      id: item._id,
      touristId: item.touristId,
      touristName: item.touristName,
      countryOfOrigin: item.countryOfOrigin,
      incidentType: item.incidentType,
      status: item.status,
      filedAt: item.filedAt,
      submittedBy: {
        authorityId: item.submittedBy?.authorityId || null,
        fullName: item.submittedBy?.fullName || null,
      },
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('getEFIRSummaries error:', err);
    next(err);
  }
};

// @desc    Create/store e-FIR
// @route   POST /api/authority/efir
// @access  Private (authority)
exports.createEFIR = async (req, res, next) => {
  try {
    const {
      touristId,
      touristName,
      countryOfOrigin,
      phoneNumber,
      emergencyContact,
      incidentType,
      incidentDescription,
      witnesses,
      additionalInformation,
      status,
    } = req.body;

    if (
      !touristId ||
      !touristName ||
      !countryOfOrigin ||
      !phoneNumber ||
      !emergencyContact ||
      !incidentType ||
      !incidentDescription
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required e-FIR fields',
      });
    }

    const authorityMongoId = req.user?.id || req.user?._id || null;
    let authorityMeta = {
      authorityMongoId,
      authorityId: null,
      fullName: null,
      role: req.user?.role || null,
    };

    if (authorityMongoId) {
      const authority = await Authority.findById(authorityMongoId)
        .select('authorityId fullName role')
        .lean();

      if (authority) {
        authorityMeta = {
          authorityMongoId,
          authorityId: authority.authorityId || null,
          fullName: authority.fullName || null,
          role: authority.role || req.user?.role || null,
        };
      }
    }

    const efir = await EFIR.create({
      touristId,
      touristName,
      countryOfOrigin,
      phoneNumber,
      emergencyContact,
      incidentType,
      incidentDescription,
      witnesses: witnesses || '',
      additionalInformation: additionalInformation || '',
      status: status || 'submitted',
      submittedBy: authorityMeta,
      filedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'e-FIR saved successfully',
      data: {
        id: efir._id,
        touristId: efir.touristId,
        incidentType: efir.incidentType,
        status: efir.status,
        filedAt: efir.filedAt,
      },
    });
  } catch (err) {
    console.error('createEFIR error:', err);
    next(err);
  }
};
