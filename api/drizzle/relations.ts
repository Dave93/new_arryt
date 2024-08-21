import { relations } from "drizzle-orm/relations";
import { users, apiTokens, organization, city, constructedBonusPricing, courierTerminalBalance, terminals, customersComments, customers, assets, dailyGarant, dailyGarantTasks, timesheet, deliveryPricing, orderBonusPricing, orderStatus, otp, outsideRequests, permissions, post, postPropTypes, roles, scheduledReports, scheduledReportsSubscription, workScheduleEntries, workSchedules, usersTerminals, usersWorkSchedules, rolesPermissions, usersPermissions, usersRoles, orderVotes, managerWithdraw, orderTransactions } from "./schema";

export const apiTokensRelations = relations(apiTokens, ({one}) => ({
	user_createdBy: one(users, {
		fields: [apiTokens.createdBy],
		references: [users.id],
		relationName: "apiTokens_createdBy_users_id"
	}),
	organization: one(organization, {
		fields: [apiTokens.organizationId],
		references: [organization.id]
	}),
	user_updatedBy: one(users, {
		fields: [apiTokens.updatedBy],
		references: [users.id],
		relationName: "apiTokens_updatedBy_users_id"
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	apiTokens_createdBy: many(apiTokens, {
		relationName: "apiTokens_createdBy_users_id"
	}),
	apiTokens_updatedBy: many(apiTokens, {
		relationName: "apiTokens_updatedBy_users_id"
	}),
	cities_createdBy: many(city, {
		relationName: "city_createdBy_users_id"
	}),
	cities_updatedBy: many(city, {
		relationName: "city_updatedBy_users_id"
	}),
	courierTerminalBalances_courierId: many(courierTerminalBalance, {
		relationName: "courierTerminalBalance_courierId_users_id"
	}),
	courierTerminalBalances_createdBy: many(courierTerminalBalance, {
		relationName: "courierTerminalBalance_createdBy_users_id"
	}),
	customersComments: many(customersComments),
	dailyGarantTasks: many(dailyGarantTasks),
	deliveryPricings_createdBy: many(deliveryPricing, {
		relationName: "deliveryPricing_createdBy_users_id"
	}),
	deliveryPricings_updatedBy: many(deliveryPricing, {
		relationName: "deliveryPricing_updatedBy_users_id"
	}),
	orderBonusPricings_courierId: many(orderBonusPricing, {
		relationName: "orderBonusPricing_courierId_users_id"
	}),
	orderBonusPricings_createdBy: many(orderBonusPricing, {
		relationName: "orderBonusPricing_createdBy_users_id"
	}),
	orderBonusPricings_updatedBy: many(orderBonusPricing, {
		relationName: "orderBonusPricing_updatedBy_users_id"
	}),
	organizations_createdBy: many(organization, {
		relationName: "organization_createdBy_users_id"
	}),
	organizations_updatedBy: many(organization, {
		relationName: "organization_updatedBy_users_id"
	}),
	otps: many(otp),
	outsideRequests_createdBy: many(outsideRequests, {
		relationName: "outsideRequests_createdBy_users_id"
	}),
	outsideRequests_updatedBy: many(outsideRequests, {
		relationName: "outsideRequests_updatedBy_users_id"
	}),
	permissions_createdBy: many(permissions, {
		relationName: "permissions_createdBy_users_id"
	}),
	permissions_updatedBy: many(permissions, {
		relationName: "permissions_updatedBy_users_id"
	}),
	posts_createdBy: many(post, {
		relationName: "post_createdBy_users_id"
	}),
	posts_updatedBy: many(post, {
		relationName: "post_updatedBy_users_id"
	}),
	posts_userId: many(post, {
		relationName: "post_userId_users_id"
	}),
	postPropTypes_createdBy: many(postPropTypes, {
		relationName: "postPropTypes_createdBy_users_id"
	}),
	postPropTypes_updatedBy: many(postPropTypes, {
		relationName: "postPropTypes_updatedBy_users_id"
	}),
	roles_createdBy: many(roles, {
		relationName: "roles_createdBy_users_id"
	}),
	roles_updatedBy: many(roles, {
		relationName: "roles_updatedBy_users_id"
	}),
	scheduledReportsSubscriptions: many(scheduledReportsSubscription),
	timesheets: many(timesheet),
	dailyGarant: one(dailyGarant, {
		fields: [users.dailyGarantId],
		references: [dailyGarant.id]
	}),
	workScheduleEntries_createdBy: many(workScheduleEntries, {
		relationName: "workScheduleEntries_createdBy_users_id"
	}),
	workScheduleEntries_updatedBy: many(workScheduleEntries, {
		relationName: "workScheduleEntries_updatedBy_users_id"
	}),
	workScheduleEntries_userId: many(workScheduleEntries, {
		relationName: "workScheduleEntries_userId_users_id"
	}),
	workSchedules_createdBy: many(workSchedules, {
		relationName: "workSchedules_createdBy_users_id"
	}),
	workSchedules_updatedBy: many(workSchedules, {
		relationName: "workSchedules_updatedBy_users_id"
	}),
	usersTerminals: many(usersTerminals),
	usersWorkSchedules: many(usersWorkSchedules),
	rolesPermissions_createdBy: many(rolesPermissions, {
		relationName: "rolesPermissions_createdBy_users_id"
	}),
	rolesPermissions_updatedBy: many(rolesPermissions, {
		relationName: "rolesPermissions_updatedBy_users_id"
	}),
	usersPermissions_createdBy: many(usersPermissions, {
		relationName: "usersPermissions_createdBy_users_id"
	}),
	usersPermissions_updatedBy: many(usersPermissions, {
		relationName: "usersPermissions_updatedBy_users_id"
	}),
	usersPermissions_userId: many(usersPermissions, {
		relationName: "usersPermissions_userId_users_id"
	}),
	usersRoles_createdBy: many(usersRoles, {
		relationName: "usersRoles_createdBy_users_id"
	}),
	usersRoles_updatedBy: many(usersRoles, {
		relationName: "usersRoles_updatedBy_users_id"
	}),
	usersRoles_userId: many(usersRoles, {
		relationName: "usersRoles_userId_users_id"
	}),
	orderVotes_courierId: many(orderVotes, {
		relationName: "orderVotes_courierId_users_id"
	}),
	orderVotes_createdBy: many(orderVotes, {
		relationName: "orderVotes_createdBy_users_id"
	}),
	managerWithdraws_courierId: many(managerWithdraw, {
		relationName: "managerWithdraw_courierId_users_id"
	}),
	managerWithdraws_createdBy: many(managerWithdraw, {
		relationName: "managerWithdraw_createdBy_users_id"
	}),
	managerWithdraws_managerId: many(managerWithdraw, {
		relationName: "managerWithdraw_managerId_users_id"
	}),
	orderTransactions_courierId: many(orderTransactions, {
		relationName: "orderTransactions_courierId_users_id"
	}),
	orderTransactions_createdBy: many(orderTransactions, {
		relationName: "orderTransactions_createdBy_users_id"
	}),
}));

export const organizationRelations = relations(organization, ({one, many}) => ({
	apiTokens: many(apiTokens),
	constructedBonusPricings: many(constructedBonusPricing),
	courierTerminalBalances: many(courierTerminalBalance),
	deliveryPricings: many(deliveryPricing),
	orderBonusPricings: many(orderBonusPricing),
	orderStatuses: many(orderStatus),
	user_createdBy: one(users, {
		fields: [organization.createdBy],
		references: [users.id],
		relationName: "organization_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [organization.updatedBy],
		references: [users.id],
		relationName: "organization_updatedBy_users_id"
	}),
	terminals: many(terminals),
	workSchedules: many(workSchedules),
	managerWithdraws: many(managerWithdraw),
	orderTransactions: many(orderTransactions),
}));

export const cityRelations = relations(city, ({one, many}) => ({
	user_createdBy: one(users, {
		fields: [city.createdBy],
		references: [users.id],
		relationName: "city_createdBy_users_id"
	}),
	city: one(city, {
		fields: [city.parentId],
		references: [city.id],
		relationName: "city_parentId_city_id"
	}),
	cities: many(city, {
		relationName: "city_parentId_city_id"
	}),
	user_updatedBy: one(users, {
		fields: [city.updatedBy],
		references: [users.id],
		relationName: "city_updatedBy_users_id"
	}),
	posts: many(post),
}));

export const constructedBonusPricingRelations = relations(constructedBonusPricing, ({one}) => ({
	organization: one(organization, {
		fields: [constructedBonusPricing.organizationId],
		references: [organization.id]
	}),
}));

export const courierTerminalBalanceRelations = relations(courierTerminalBalance, ({one}) => ({
	user_courierId: one(users, {
		fields: [courierTerminalBalance.courierId],
		references: [users.id],
		relationName: "courierTerminalBalance_courierId_users_id"
	}),
	user_createdBy: one(users, {
		fields: [courierTerminalBalance.createdBy],
		references: [users.id],
		relationName: "courierTerminalBalance_createdBy_users_id"
	}),
	organization: one(organization, {
		fields: [courierTerminalBalance.organizationId],
		references: [organization.id]
	}),
	terminal: one(terminals, {
		fields: [courierTerminalBalance.terminalId],
		references: [terminals.id]
	}),
}));

export const terminalsRelations = relations(terminals, ({one, many}) => ({
	courierTerminalBalances: many(courierTerminalBalance),
	deliveryPricings: many(deliveryPricing),
	orderBonusPricings: many(orderBonusPricing),
	terminal: one(terminals, {
		fields: [terminals.linkedTerminalId],
		references: [terminals.id],
		relationName: "terminals_linkedTerminalId_terminals_id"
	}),
	terminals: many(terminals, {
		relationName: "terminals_linkedTerminalId_terminals_id"
	}),
	organization: one(organization, {
		fields: [terminals.organizationId],
		references: [organization.id]
	}),
	usersTerminals: many(usersTerminals),
	orderVotes: many(orderVotes),
	managerWithdraws: many(managerWithdraw),
	orderTransactions: many(orderTransactions),
}));

export const customersCommentsRelations = relations(customersComments, ({one}) => ({
	user: one(users, {
		fields: [customersComments.createdBy],
		references: [users.id]
	}),
	customer: one(customers, {
		fields: [customersComments.customerId],
		references: [customers.id]
	}),
	asset_imageId: one(assets, {
		fields: [customersComments.imageId],
		references: [assets.id],
		relationName: "customersComments_imageId_assets_id"
	}),
	asset_voiceId: one(assets, {
		fields: [customersComments.voiceId],
		references: [assets.id],
		relationName: "customersComments_voiceId_assets_id"
	}),
}));

export const customersRelations = relations(customers, ({many}) => ({
	customersComments: many(customersComments),
}));

export const assetsRelations = relations(assets, ({many}) => ({
	customersComments_imageId: many(customersComments, {
		relationName: "customersComments_imageId_assets_id"
	}),
	customersComments_voiceId: many(customersComments, {
		relationName: "customersComments_voiceId_assets_id"
	}),
}));

export const dailyGarantTasksRelations = relations(dailyGarantTasks, ({one}) => ({
	dailyGarant: one(dailyGarant, {
		fields: [dailyGarantTasks.dailyGarantId],
		references: [dailyGarant.id]
	}),
	timesheet: one(timesheet, {
		fields: [dailyGarantTasks.timesheetId],
		references: [timesheet.id]
	}),
	user: one(users, {
		fields: [dailyGarantTasks.userId],
		references: [users.id]
	}),
}));

export const dailyGarantRelations = relations(dailyGarant, ({many}) => ({
	dailyGarantTasks: many(dailyGarantTasks),
	users: many(users),
}));

export const timesheetRelations = relations(timesheet, ({one, many}) => ({
	dailyGarantTasks: many(dailyGarantTasks),
	user: one(users, {
		fields: [timesheet.userId],
		references: [users.id]
	}),
}));

export const deliveryPricingRelations = relations(deliveryPricing, ({one}) => ({
	user_createdBy: one(users, {
		fields: [deliveryPricing.createdBy],
		references: [users.id],
		relationName: "deliveryPricing_createdBy_users_id"
	}),
	organization: one(organization, {
		fields: [deliveryPricing.organizationId],
		references: [organization.id]
	}),
	terminal: one(terminals, {
		fields: [deliveryPricing.terminalId],
		references: [terminals.id]
	}),
	user_updatedBy: one(users, {
		fields: [deliveryPricing.updatedBy],
		references: [users.id],
		relationName: "deliveryPricing_updatedBy_users_id"
	}),
}));

export const orderBonusPricingRelations = relations(orderBonusPricing, ({one}) => ({
	user_courierId: one(users, {
		fields: [orderBonusPricing.courierId],
		references: [users.id],
		relationName: "orderBonusPricing_courierId_users_id"
	}),
	user_createdBy: one(users, {
		fields: [orderBonusPricing.createdBy],
		references: [users.id],
		relationName: "orderBonusPricing_createdBy_users_id"
	}),
	organization: one(organization, {
		fields: [orderBonusPricing.organizationId],
		references: [organization.id]
	}),
	terminal: one(terminals, {
		fields: [orderBonusPricing.terminalId],
		references: [terminals.id]
	}),
	user_updatedBy: one(users, {
		fields: [orderBonusPricing.updatedBy],
		references: [users.id],
		relationName: "orderBonusPricing_updatedBy_users_id"
	}),
}));

export const orderStatusRelations = relations(orderStatus, ({one}) => ({
	organization: one(organization, {
		fields: [orderStatus.organizationId],
		references: [organization.id]
	}),
}));

export const otpRelations = relations(otp, ({one}) => ({
	user: one(users, {
		fields: [otp.userId],
		references: [users.id]
	}),
}));

export const outsideRequestsRelations = relations(outsideRequests, ({one}) => ({
	user_createdBy: one(users, {
		fields: [outsideRequests.createdBy],
		references: [users.id],
		relationName: "outsideRequests_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [outsideRequests.updatedBy],
		references: [users.id],
		relationName: "outsideRequests_updatedBy_users_id"
	}),
}));

export const permissionsRelations = relations(permissions, ({one, many}) => ({
	user_createdBy: one(users, {
		fields: [permissions.createdBy],
		references: [users.id],
		relationName: "permissions_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [permissions.updatedBy],
		references: [users.id],
		relationName: "permissions_updatedBy_users_id"
	}),
	rolesPermissions: many(rolesPermissions),
	usersPermissions: many(usersPermissions),
}));

export const postRelations = relations(post, ({one}) => ({
	city: one(city, {
		fields: [post.cityId],
		references: [city.id]
	}),
	user_createdBy: one(users, {
		fields: [post.createdBy],
		references: [users.id],
		relationName: "post_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [post.updatedBy],
		references: [users.id],
		relationName: "post_updatedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [post.userId],
		references: [users.id],
		relationName: "post_userId_users_id"
	}),
}));

export const postPropTypesRelations = relations(postPropTypes, ({one}) => ({
	user_createdBy: one(users, {
		fields: [postPropTypes.createdBy],
		references: [users.id],
		relationName: "postPropTypes_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [postPropTypes.updatedBy],
		references: [users.id],
		relationName: "postPropTypes_updatedBy_users_id"
	}),
}));

export const rolesRelations = relations(roles, ({one, many}) => ({
	user_createdBy: one(users, {
		fields: [roles.createdBy],
		references: [users.id],
		relationName: "roles_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [roles.updatedBy],
		references: [users.id],
		relationName: "roles_updatedBy_users_id"
	}),
	rolesPermissions: many(rolesPermissions),
	usersRoles: many(usersRoles),
}));

export const scheduledReportsSubscriptionRelations = relations(scheduledReportsSubscription, ({one}) => ({
	scheduledReport: one(scheduledReports, {
		fields: [scheduledReportsSubscription.reportId],
		references: [scheduledReports.id]
	}),
	user: one(users, {
		fields: [scheduledReportsSubscription.userId],
		references: [users.id]
	}),
}));

export const scheduledReportsRelations = relations(scheduledReports, ({many}) => ({
	scheduledReportsSubscriptions: many(scheduledReportsSubscription),
}));

export const workScheduleEntriesRelations = relations(workScheduleEntries, ({one}) => ({
	user_createdBy: one(users, {
		fields: [workScheduleEntries.createdBy],
		references: [users.id],
		relationName: "workScheduleEntries_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [workScheduleEntries.updatedBy],
		references: [users.id],
		relationName: "workScheduleEntries_updatedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [workScheduleEntries.userId],
		references: [users.id],
		relationName: "workScheduleEntries_userId_users_id"
	}),
	workSchedule: one(workSchedules, {
		fields: [workScheduleEntries.workScheduleId],
		references: [workSchedules.id]
	}),
}));

export const workSchedulesRelations = relations(workSchedules, ({one, many}) => ({
	workScheduleEntries: many(workScheduleEntries),
	user_createdBy: one(users, {
		fields: [workSchedules.createdBy],
		references: [users.id],
		relationName: "workSchedules_createdBy_users_id"
	}),
	organization: one(organization, {
		fields: [workSchedules.organizationId],
		references: [organization.id]
	}),
	user_updatedBy: one(users, {
		fields: [workSchedules.updatedBy],
		references: [users.id],
		relationName: "workSchedules_updatedBy_users_id"
	}),
	usersWorkSchedules: many(usersWorkSchedules),
}));

export const usersTerminalsRelations = relations(usersTerminals, ({one}) => ({
	terminal: one(terminals, {
		fields: [usersTerminals.terminalId],
		references: [terminals.id]
	}),
	user: one(users, {
		fields: [usersTerminals.userId],
		references: [users.id]
	}),
}));

export const usersWorkSchedulesRelations = relations(usersWorkSchedules, ({one}) => ({
	user: one(users, {
		fields: [usersWorkSchedules.userId],
		references: [users.id]
	}),
	workSchedule: one(workSchedules, {
		fields: [usersWorkSchedules.workScheduleId],
		references: [workSchedules.id]
	}),
}));

export const rolesPermissionsRelations = relations(rolesPermissions, ({one}) => ({
	user_createdBy: one(users, {
		fields: [rolesPermissions.createdBy],
		references: [users.id],
		relationName: "rolesPermissions_createdBy_users_id"
	}),
	permission: one(permissions, {
		fields: [rolesPermissions.permissionId],
		references: [permissions.id]
	}),
	role: one(roles, {
		fields: [rolesPermissions.roleId],
		references: [roles.id]
	}),
	user_updatedBy: one(users, {
		fields: [rolesPermissions.updatedBy],
		references: [users.id],
		relationName: "rolesPermissions_updatedBy_users_id"
	}),
}));

export const usersPermissionsRelations = relations(usersPermissions, ({one}) => ({
	user_createdBy: one(users, {
		fields: [usersPermissions.createdBy],
		references: [users.id],
		relationName: "usersPermissions_createdBy_users_id"
	}),
	permission: one(permissions, {
		fields: [usersPermissions.permissionId],
		references: [permissions.id]
	}),
	user_updatedBy: one(users, {
		fields: [usersPermissions.updatedBy],
		references: [users.id],
		relationName: "usersPermissions_updatedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [usersPermissions.userId],
		references: [users.id],
		relationName: "usersPermissions_userId_users_id"
	}),
}));

export const usersRolesRelations = relations(usersRoles, ({one}) => ({
	user_createdBy: one(users, {
		fields: [usersRoles.createdBy],
		references: [users.id],
		relationName: "usersRoles_createdBy_users_id"
	}),
	role: one(roles, {
		fields: [usersRoles.roleId],
		references: [roles.id]
	}),
	user_updatedBy: one(users, {
		fields: [usersRoles.updatedBy],
		references: [users.id],
		relationName: "usersRoles_updatedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [usersRoles.userId],
		references: [users.id],
		relationName: "usersRoles_userId_users_id"
	}),
}));

export const orderVotesRelations = relations(orderVotes, ({one}) => ({
	user_courierId: one(users, {
		fields: [orderVotes.courierId],
		references: [users.id],
		relationName: "orderVotes_courierId_users_id"
	}),
	user_createdBy: one(users, {
		fields: [orderVotes.createdBy],
		references: [users.id],
		relationName: "orderVotes_createdBy_users_id"
	}),
	terminal: one(terminals, {
		fields: [orderVotes.terminalId],
		references: [terminals.id]
	}),
}));

export const managerWithdrawRelations = relations(managerWithdraw, ({one}) => ({
	user_courierId: one(users, {
		fields: [managerWithdraw.courierId],
		references: [users.id],
		relationName: "managerWithdraw_courierId_users_id"
	}),
	user_createdBy: one(users, {
		fields: [managerWithdraw.createdBy],
		references: [users.id],
		relationName: "managerWithdraw_createdBy_users_id"
	}),
	user_managerId: one(users, {
		fields: [managerWithdraw.managerId],
		references: [users.id],
		relationName: "managerWithdraw_managerId_users_id"
	}),
	organization: one(organization, {
		fields: [managerWithdraw.organizationId],
		references: [organization.id]
	}),
	terminal: one(terminals, {
		fields: [managerWithdraw.terminalId],
		references: [terminals.id]
	}),
}));

export const orderTransactionsRelations = relations(orderTransactions, ({one}) => ({
	user_courierId: one(users, {
		fields: [orderTransactions.courierId],
		references: [users.id],
		relationName: "orderTransactions_courierId_users_id"
	}),
	user_createdBy: one(users, {
		fields: [orderTransactions.createdBy],
		references: [users.id],
		relationName: "orderTransactions_createdBy_users_id"
	}),
	organization: one(organization, {
		fields: [orderTransactions.organizationId],
		references: [organization.id]
	}),
	terminal: one(terminals, {
		fields: [orderTransactions.terminalId],
		references: [terminals.id]
	}),
}));