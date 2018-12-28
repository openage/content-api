# aqua social api

headers:

- x-access-token - the requests that needs to get user specific data or is tying to get secured data
- x-school-code - the requests that needs school specific data

## apis

### users

### profiles

### connections

### communities

### activites

### comments

### participants

### memberships

### messages

### tags

### interests

### notes

## attributes of a profile

- string: role - `admin`, `teacher`, `student`

- boolean: isPublic - if public that profile represents the school in some way and will be listed in the public dashboard of the school

- community: defaultCommunity - a community that the user will be enrolled by default with the concept of waiting room. An approval would be needed to enter the default community. Till then the user would be assumed to be in `waiting room` where he would be limited to view only roles.

### types of profiles

based on above attributes the user can be of one type

#### student

- isPublic `false`
- role `student`
- default community  `Class Room`

#### teacher

- isPublic `false`
- role `teacher`
- default community  `Staff Room`

#### dashboard profile

- isPublic `true`

## attributes of a school

- boolean: hasCourses - school will not have courses/college will have

## attributes of a activity

- string:icon - `calendar` (default), `work`, `document`, `gallery`, `announcement`, `query`

## attributes of a community

- profile: owner - the person who would manage the community
- boolean: isPublic - if the community visible to others. such communities can be joined by invitation only. Only _admin_ can set/unset this flag
- boolean: isDefault - if the community is forced on users, only _admin_ can set/unset this flag
- string:icon - `board`, `entertainment`, `club`, `collection` (default), `project`, `learning`, `question`, `room`,

### type of communities

#### dashboard communities

- isPublic `true`
- isDefault `true`

behaviour

- won't have teacher's and student's section
- won't have group discussions section
- only owner can create an activity
- activity won't have dicussion section
- nobody can join

examples `Notice Board`, `Traning and Placement` etc

#### personal communities

- isPublic `false`
- isDefault `false`

behaviour

- will have teacher's and student's section
- will have group discussions section
- any active member can create an activity
- activites will have dicussion section
- joining by invitation only

examples `my close friends`, `rasberry pi project`

#### public communities

- isPublic `true`
- isDefault `false`

behaviour

- will have teacher's and student's section
- won't have group discussions section
- any active member can create an activity - may need owner's approval
- activites will have dicussion section
- joining by invitation as well as by invite

examples `first citizens`, `dramatics club`, `buy and sell`

#### default communities

- isPublic `false`
- isDefault `true`

behaviour

- will have teacher's and student's section
- won't have group discussions section
- any active member can create an activity - may need owner's approval
- activites will have dicussion section
- auto join (like at signup) with owner's approval

examples `class room`, `staff room`